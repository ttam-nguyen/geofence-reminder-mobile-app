/**
 * GeofencingService — TypeScript orchestration for native geofencing.
 *
 * Design (and why it changed):
 *
 * Native transitions are the source of truth. Google Play Services and CoreLocation deliver
 * ENTER/EXIT/DWELL whether or not the app is running, so both platforms persist every
 * transition natively (Android: GeofenceEventStore). JS drains that queue on start, on resume,
 * and whenever the native side signals "events available". The old code only listened to a live
 * event emitter, so every transition that happened while the app was backgrounded or killed was
 * silently dropped — the user saw a status that was hours out of date.
 *
 * DWELL is the native arrival signal: the OS waits `loiteringDelay` (120 s) inside the region,
 * which is exactly the stationary requirement. Arrival therefore does not need JS polling.
 *
 * The JS stationary timer is kept as a supplement for the foreground case (better UI feedback),
 * and app-state reconciliation re-derives status from the current position so a stale
 * ARRIVAL_PENDING cannot survive a resume.
 */

import {
  AppState,
  AppStateStatus,
  DeviceEventEmitter,
  Linking,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import notifee, { EventType } from '@notifee/react-native';
import { notificationService } from './notificationService';
import { ReminderStatus, Reminder } from '../types/Reminder';
import { processGeofenceEvent, GeofenceEventType } from '../models/eventProcessor';
import { store, scheduleReminderNotification } from '../stores/reminderStore';
import { StationaryService, StationaryCandidate } from './stationaryService';
import { haversineDistance } from '../models/haversine';
import { log } from './logger';
import type { LocationSample } from '../types/location';

const GeofencingModule = NativeModules.GeofencingModule as any;

const GEOFENCE_QUEUED_EVENT = 'geofenceEventQueued';

export const TRANSITION_ENTER = 1;
export const TRANSITION_EXIT = 2;
export const TRANSITION_DWELL = 4;

/** Safety-net drain and foreground reconciliation while the app is in the foreground. */
const FOREGROUND_TICK_INTERVAL_MS = 60_000;

/** A persisted stationary reading is only usable for recovery if it is this recent. */
const MAX_STATIONARY_RECOVERY_GAP_MS = 5 * 60 * 1000;

/** How long a resolved position is trusted during reconciliation. */
const RECONCILE_MAX_AGE_MS = 30_000;

export interface GeofenceInfo {
  reminderId: string;
  latitude: number;
  longitude: number;
  radius: number;
}

/** A geofence transition as persisted by the native layer. */
export interface NativeGeofenceEvent {
  id: number;
  reminderId: string;
  transitionType: number;
  /** Epoch milliseconds when the transition happened. */
  at: number;
  latitude?: number;
  longitude?: number;
}

/** Kept for the Developer Mode controls. */
export interface GeofenceEvent {
  reminderId: string;
  transitionType: number;
  latitude?: number;
  longitude?: number;
}

type NotificationTapData = { reminderId?: string };

const registeredGeofences = new Map<string, Reminder>();
const stationaryService = new StationaryService();

let onStatusChange: ((reminderId: string, newStatus: ReminderStatus) => void) | null = null;
let onArrivalTriggered: ((reminderId: string) => void) | null = null;
let onStationaryUpdate: ((reminderId: string, remainingMs: number) => void) | null = null;
let onPermissionChange: ((permissionState: string) => void) | null = null;
let onNotificationTap: ((data: NotificationTapData) => void) | null = null;

const updateIntervals = new Map<string, ReturnType<typeof setInterval>>();
const gpsWatchIds = new Map<string, string | number>();

/** Minimum spacing between stationary sample log lines, per reminder. */
const SAMPLE_LOG_INTERVAL_MS = 10_000;
const lastSampleLogRef = new Map<string, number>();
const lastSampleVerdictRef = new Map<string, string>();

let nativeQueueSubscription: { remove: () => void } | null = null;
let initialized = false;
let drainInFlight: Promise<void> | null = null;
let reconcileInFlight: Promise<void> | null = null;
let foregroundDrainTimer: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let lastAppState: AppStateStatus = (AppState.currentState ?? 'active') as AppStateStatus;

/** True while the app is in the foreground — sampling is paused otherwise. */
let appActive = lastAppState === 'active';

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/** Initialise listeners, drain persisted events, and restore geofence state. */
export function initGeofencingService(): void {
  if (initialized) {
    log.debug('geofence', 'initGeofencingService already initialised — skipping');
    return;
  }
  initialized = true;

  // The native side emits through RCTDeviceEventEmitter, so listen there. Constructing a
  // NativeEventEmitter over a plain ReactContextBaseJavaModule logs a "missing addListener"
  // warning on every launch and buys nothing.
  if (!GeofencingModule) {
    log.warn('geofence', 'Native GeofencingModule unavailable — geofencing disabled');
  } else {
    nativeQueueSubscription?.remove();
    nativeQueueSubscription = DeviceEventEmitter.addListener(GEOFENCE_QUEUED_EVENT, payload => {
      log.debug('geofence', 'Native signalled queued geofence events', payload);
      void drainNativeGeofenceEvents();
    });
  }

  notifee.onForegroundEvent(async ({ type, detail }) => {
    if (type !== EventType.PRESS) return;
    const notificationId = detail?.notification?.id;
    const data = (detail?.notification?.data as NotificationTapData) || {};
    log.info('notification', 'Notification pressed (foreground)', { notificationId, data });
    if (onNotificationTap) {
      onNotificationTap({
        reminderId: typeof notificationId === 'string' ? notificationId : data.reminderId,
      });
    }
  });

  appStateSubscription = AppState.addEventListener('change', handleAppStateChange) as unknown as {
    remove: () => void;
  };

  log.info('geofence', 'Geofencing service initialising');

  void logPermissionSnapshot('startup');

  if (GeofencingModule && appActive) {
    startForegroundDrainTimer();
  }

  void (async () => {
    // Order matters: register geofences first so the OS starts reporting, then process
    // anything that happened while the app was not running, then reconcile with the fix.
    await registerAllActiveGeofences().catch(error =>
      log.error('geofence', 'Failed to re-register active geofences', { error: String(error) }),
    );
    await drainNativeGeofenceEvents();
    await reconcileActiveReminders('startup');
  })();
}

function handleAppStateChange(nextState: AppStateStatus): void {
  const previous = lastAppState;
  lastAppState = nextState;
  appActive = nextState === 'active';

  // Android reports an 'active' change at startup that is not a real transition. Ignoring it
  // avoids registering every geofence twice per launch.
  if (previous === nextState) {
    return;
  }

  log.info('app', `App state: ${previous} → ${nextState}`);

  if (nextState === 'active') {
    startForegroundDrainTimer();
    void logPermissionSnapshot('resume');
    void (async () => {
      // Re-register on every resume: some OEMs drop geofences on process death, and the reminder
      // metadata (including the notify-on-arrival flag) must match the current status.
      await registerAllActiveGeofences().catch(error =>
        log.error('geofence', 'Failed to re-register geofences on resume', {
          error: String(error),
        }),
      );
      await drainNativeGeofenceEvents();
      await reconcileActiveReminders('resume');
      await resumeArrivalSampling();
    })();
  } else {
    stopForegroundDrainTimer();
    // Foreground-only sampling: the native DWELL transition covers the background case and
    // costs no battery. Watches and timers are dropped while backgrounded.
    pauseArrivalSampling();
  }
}

function startForegroundDrainTimer(): void {
  if (foregroundDrainTimer !== null) return;
  foregroundDrainTimer = setInterval(() => {
    // Drain native transitions first, then re-derive status from the current fix, so a session
    // that stays in the foreground still notices an arrival within a minute.
    void (async () => {
      await drainNativeGeofenceEvents();
      await reconcileActiveReminders('foreground-tick');
    })();
  }, FOREGROUND_TICK_INTERVAL_MS);
  // Unref under Node (Jest) so the safety-net timer cannot hold the test process open.
  (foregroundDrainTimer as unknown as { unref?: () => void }).unref?.();
}

/**
 * Log the permission state that decides whether the OS reports transitions while backgrounded.
 * Without ACCESS_BACKGROUND_LOCATION on Android 10+, geofencing only reports while the app is in
 * the foreground — which looks exactly like "it only works when I open the app".
 */
async function logPermissionSnapshot(reason: string): Promise<void> {
  try {
    let fine = 'unknown';
    let background = 'unknown';

    if (Platform.OS === 'android') {
      fine = (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION))
        ? 'granted'
        : 'denied';
      background = (await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
      ))
        ? 'granted'
        : 'denied';
    } else {
      fine = await getAuthorizationStatus();
    }

    const notifications = await notificationService.checkPermission();

    log.info('permission', 'Permission snapshot', {
      reason,
      foregroundLocation: fine,
      backgroundLocation: background,
      notifications,
    });
  } catch (error) {
    log.warn('permission', 'Could not read permission state', { reason, error: String(error) });
  }
}

function stopForegroundDrainTimer(): void {
  if (foregroundDrainTimer === null) return;
  clearInterval(foregroundDrainTimer);
  foregroundDrainTimer = null;
}

// ---------------------------------------------------------------------------
// Callback setters
// ---------------------------------------------------------------------------

export function setOnNotificationTap(callback: (data: NotificationTapData) => void): void {
  onNotificationTap = callback;
}

export function setOnStatusChange(callback: (reminderId: string, newStatus: ReminderStatus) => void): void {
  onStatusChange = callback;
}

export function setOnArrivalTriggered(callback: (reminderId: string) => void): void {
  onArrivalTriggered = callback;
}

export function setOnStationaryUpdate(callback: (reminderId: string, remainingMs: number) => void): void {
  onStationaryUpdate = callback;
}

export function setOnPermissionChange(callback: (permissionState: string) => void): void {
  onPermissionChange = callback;
}

// ---------------------------------------------------------------------------
// Geofence registration
// ---------------------------------------------------------------------------

/** Build the notification copy cached natively so arrival can notify with the app closed. */
function buildArrivalCopy(reminder: Reminder): { title: string; body: string } {
  return {
    title: reminder.title,
    body: reminder.description || `Reminder at ${reminder.locationName || 'this location'}`,
  };
}

/** Register a native geofence for an active reminder. */
export async function registerReminderGeofence(
  reminder: Reminder,
  userPosition?: { latitude: number; longitude: number },
): Promise<void> {
  // ARRIVAL_PENDING is included so its native metadata stays current after a restart; it is
  // already inside the region, so re-registering is a no-op for Play Services.
  const registrableStatuses: ReminderStatus[] = [
    ReminderStatus.ARMED,
    ReminderStatus.WAITING_FOR_EXIT,
    ReminderStatus.ARRIVAL_PENDING,
  ];
  if (!registrableStatuses.includes(reminder.status)) {
    log.debug('geofence', 'Skip registration — reminder is not active', {
      reminderId: reminder.id,
      status: reminder.status,
    });
    return;
  }

  if (userPosition) {
    const distance = haversineDistance(
      userPosition.latitude,
      userPosition.longitude,
      reminder.latitude,
      reminder.longitude,
    );
    if (distance > 10_000) {
      log.info('geofence', 'Registering a far-away geofence', {
        reminderId: reminder.id,
        distanceMeters: Math.round(distance),
      });
    }
  }

  const copy = buildArrivalCopy(reminder);

  // Only these statuses may alert on arrival. WAITING_FOR_EXIT means the user was already inside
  // the radius when the reminder was created, so they must leave and come back first. The native
  // side posts the DWELL notification itself, so it needs the same rule.
  const notifyOnDwell =
    reminder.status === ReminderStatus.ARMED ||
    reminder.status === ReminderStatus.ARRIVAL_PENDING;

  try {
    await GeofencingModule.registerGeofence(
      reminder.id,
      reminder.latitude,
      reminder.longitude,
      reminder.radiusMeters,
      copy.title,
      copy.body,
      notifyOnDwell,
    );
    registeredGeofences.set(reminder.id, reminder);
    log.info('geofence', 'Geofence registered', {
      reminderId: reminder.id,
      radius: reminder.radiusMeters,
      status: reminder.status,
      notifyOnDwell,
    });
  } catch (error) {
    log.error('geofence', 'Failed to register geofence', {
      reminderId: reminder.id,
      error: String(error),
    });
  }
}

/** Unregister a native geofence. */
export async function unregisterReminderGeofence(reminderId: string): Promise<void> {
  try {
    await GeofencingModule.unregisterGeofence(reminderId);
    registeredGeofences.delete(reminderId);
    log.info('geofence', 'Geofence unregistered', { reminderId });
  } catch (error) {
    log.error('geofence', 'Failed to unregister geofence', { reminderId, error: String(error) });
  }
}

/** Re-register geofences for every active reminder and recover in-flight arrivals. */
export async function registerAllActiveGeofences(): Promise<void> {
  const activeReminders = await store.findActive();

  log.info('geofence', 'Re-registering active geofences', {
    count: activeReminders.length,
    ids: activeReminders.map(r => `${r.id}:${r.status}`),
  });

  for (const reminder of activeReminders) {
    await registerReminderGeofence(reminder);

    if (reminder.status === ReminderStatus.ARRIVAL_PENDING) {
      await resumeStationaryTimer(reminder);
    }
  }
}

export async function listRegisteredGeofences(): Promise<GeofenceInfo[]> {
  try {
    return await GeofencingModule.listRegisteredGeofences();
  } catch {
    return Array.from(registeredGeofences.values()).map(reminder => ({
      reminderId: reminder.id,
      latitude: reminder.latitude,
      longitude: reminder.longitude,
      radius: reminder.radiusMeters,
    }));
  }
}

export async function getAuthorizationStatus(): Promise<string> {
  try {
    return await GeofencingModule.getAuthorizationStatus();
  } catch {
    return 'unknown';
  }
}

/** Request foreground location permission. */
export async function requestLocationPermission(): Promise<void> {
  try {
    const result = await GeofencingModule.requestLocationPermission();
    log.info('permission', 'Location permission requested', { result });
    if (onPermissionChange) {
      onPermissionChange(typeof result === 'string' ? result : 'authorized');
    }
  } catch (error) {
    log.error('permission', 'Location permission request failed', { error: String(error) });
    if (onPermissionChange) {
      onPermissionChange('denied');
    }
  }
}

/**
 * Background location is required for geofence transitions while the app is not in the
 * foreground on Android 10+. Without it the OS only reports transitions while the app is open,
 * which is the reason statuses appeared frozen.
 *
 * Android 11+ forbids requesting it directly, so the user is sent to the app settings screen.
 */
export async function requestBackgroundLocationPermission(): Promise<
  'granted' | 'denied' | 'settings-opened' | 'unsupported'
> {
  if (Platform.OS !== 'android') {
    return 'unsupported';
  }

  const permission = PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION;
  const sdkVersion = typeof Platform.Version === 'number' ? Platform.Version : Number(Platform.Version);

  const already = await PermissionsAndroid.check(permission);
  if (already) {
    log.info('permission', 'Background location already granted');
    return 'granted';
  }

  if (sdkVersion >= 30) {
    // Android 11+: the OS only grants "Allow all the time" through the settings screen.
    log.warn('permission', 'Background location must be granted from app settings (Android 11+)');
    await Linking.openSettings();
    return 'settings-opened';
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Background location',
    message:
      'GPS Reminder needs background location to detect arrivals while the app is closed.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });

  log.info('permission', 'Background location request result', { result });
  return result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
}

// ---------------------------------------------------------------------------
// Native event draining
// ---------------------------------------------------------------------------

/**
 * Drain every transition persisted by the native layer and apply it in order.
 * Safe to call repeatedly: the native queue is cleared atomically.
 */
export function drainNativeGeofenceEvents(): Promise<void> {
  if (drainInFlight) return drainInFlight;

  drainInFlight = (async () => {
    try {
      const events: NativeGeofenceEvent[] = await GeofencingModule.drainPendingGeofenceEvents();
      if (!events || events.length === 0) return;

      const chronological = [...events].sort((a, b) => a.at - b.at);
      log.info('geofence', `Draining ${chronological.length} persisted geofence event(s)`, {
        events: chronological.map(e => `${labelFor(e.transitionType)}:${e.reminderId}@${new Date(e.at).toISOString()}`),
      });

      for (const event of chronological) {
        await handleNativeGeofenceEvent(event);
      }
    } catch (error) {
      log.error('geofence', 'Failed to drain native geofence events', { error: String(error) });
    } finally {
      drainInFlight = null;
    }
  })();

  return drainInFlight;
}

function labelFor(transitionType: number): string {
  switch (transitionType) {
    case TRANSITION_ENTER:
      return 'ENTER';
    case TRANSITION_EXIT:
      return 'EXIT';
    case TRANSITION_DWELL:
      return 'DWELL';
    default:
      return `UNKNOWN(${transitionType})`;
  }
}

async function handleNativeGeofenceEvent(event: NativeGeofenceEvent): Promise<void> {
  const reminder = await store.findById(event.reminderId);
  if (!reminder) {
    log.warn('geofence', 'Transition for unknown reminder', { event });
    return;
  }

  log.info('geofence', `${labelFor(event.transitionType)} applied`, {
    reminderId: reminder.id,
    status: reminder.status,
    at: new Date(event.at).toISOString(),
    latitude: event.latitude,
    longitude: event.longitude,
  });

  switch (event.transitionType) {
    case TRANSITION_ENTER:
      await handleEnter(reminder);
      break;
    case TRANSITION_EXIT:
      await handleExit(reminder);
      break;
    case TRANSITION_DWELL:
      await handleDwell(reminder);
      break;
    default:
      log.warn('geofence', 'Unhandled transition type', { transitionType: event.transitionType });
  }
}

async function handleEnter(reminder: Reminder): Promise<void> {
  await applyTransition(reminder, GeofenceEventType.ENTER, 'native ENTER');
}

async function handleExit(reminder: Reminder): Promise<void> {
  await applyTransition(reminder, GeofenceEventType.EXIT, 'native EXIT');
}

/**
 * DWELL means the user stayed inside the region for the loitering delay (120 s). That is the
 * stationary requirement, already satisfied by the OS — trigger without waiting for JS samples.
 */
async function handleDwell(reminder: Reminder): Promise<void> {
  if (reminder.status !== ReminderStatus.ARRIVAL_PENDING && reminder.status !== ReminderStatus.ARMED) {
    log.info('geofence', 'DWELL ignored for current status', {
      reminderId: reminder.id,
      status: reminder.status,
    });
    return;
  }

  log.info('geofence', 'DWELL confirms arrival', {
    reminderId: reminder.id,
    status: reminder.status,
  });

  await triggerArrival(reminder.id, 'native DWELL', { notify: false });
}

/** Apply an ENTER/EXIT transition through the state machine. */
async function applyTransition(
  reminder: Reminder,
  eventType: GeofenceEventType,
  source: string,
): Promise<void> {
  const result = processGeofenceEvent(reminder.status, eventType);

  if (!result.transitioned) {
    log.info('geofence', `No transition for ${source}`, {
      reminderId: reminder.id,
      status: reminder.status,
    });

    // Keep the arrival candidate alive if we are (still) inside the fence.
    if (
      eventType === GeofenceEventType.ENTER &&
      reminder.status === ReminderStatus.ARRIVAL_PENDING
    ) {
      startArrivalCandidate(reminder);
    }
    return;
  }

  const updated: Reminder = {
    ...reminder,
    status: result.newStatus,
    updatedAt: new Date().toISOString(),
  };

  await store.save(updated);

  log.info('geofence', `Status ${result.previousStatus} → ${result.newStatus}`, {
    reminderId: reminder.id,
    source,
  });

  onStatusChange?.(reminder.id, result.newStatus);

  if (result.newStatus === ReminderStatus.ARRIVAL_PENDING) {
    startArrivalCandidate({ ...updated, status: result.newStatus });
  }

  if (result.newStatus === ReminderStatus.ARMED) {
    cancelArrivalCandidate(reminder.id);
  }
}

// ---------------------------------------------------------------------------
// Stationary sampling (foreground supplement)
// ---------------------------------------------------------------------------

function startArrivalCandidate(reminder: Reminder): void {
  stationaryService.startArrivalCandidate(
    reminder.id,
    reminder.latitude,
    reminder.longitude,
    reminder.radiusMeters,
  );
  startSampling(reminder.id);
}

/** Start the timer + location watch that feeds stationary qualification. */
function startSampling(reminderId: string): void {
  if (updateIntervals.has(reminderId) || gpsWatchIds.has(reminderId)) {
    return;
  }

  const intervalId = setInterval(() => {
    const remainingMs = stationaryService.getRemainingStationaryTimeMs(reminderId);
    if (remainingMs !== null) {
      onStationaryUpdate?.(reminderId, remainingMs);
    }
  }, 1000);
  updateIntervals.set(reminderId, intervalId);

  try {
    const watchId = Geolocation.watchPosition(
      position => {
        processLocationSample(reminderId, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          horizontalAccuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString(),
        });
      },
      error => {
        log.warn('stationary', 'watchPosition error', { reminderId, error: String(error) });
      },
      // distanceFilter 0 => time-based fixes even while standing still. A distance filter
      // suppresses updates when the user does not move, which stalls stationary accumulation.
      { enableHighAccuracy: true, distanceFilter: 0, interval: 3000, fastestInterval: 2000 },
    );
    gpsWatchIds.set(reminderId, watchId as number);
    log.info('stationary', 'Sampling started', { reminderId });
  } catch (error) {
    log.error('stationary', 'Failed to start watchPosition', { reminderId, error: String(error) });
  }
}

function stopSampling(reminderId: string): void {
  const intervalId = updateIntervals.get(reminderId);
  if (intervalId) {
    clearInterval(intervalId);
    updateIntervals.delete(reminderId);
  }

  const watchId = gpsWatchIds.get(reminderId);
  if (watchId !== undefined) {
    Geolocation.clearWatch(watchId as number);
    gpsWatchIds.delete(reminderId);
  }
}

function cancelArrivalCandidate(reminderId: string): void {
  stationaryService.cancelArrivalCandidate(reminderId);
  stopSampling(reminderId);
  log.info('stationary', 'Candidate cancelled', { reminderId });
}

/** Drop watches when the app goes to the background; native DWELL covers that case. */
function pauseArrivalSampling(): void {
  for (const reminderId of Array.from(gpsWatchIds.keys())) {
    stopSampling(reminderId);
  }
  for (const reminderId of Array.from(updateIntervals.keys())) {
    stopSampling(reminderId);
  }
}

/** Re-attach sampling to candidates that survived a background period or a restart. */
async function resumeArrivalSampling(): Promise<void> {
  const pending = await store.findByStatus(ReminderStatus.ARRIVAL_PENDING);
  for (const reminder of pending) {
    startSampling(reminder.id);
  }
}

/**
 * Recover an ARRIVAL_PENDING reminder across an app restart.
 *
 * The accumulated time only transfers when the persisted reading is recent; an eight-hour-old
 * reading proves nothing about the user's presence now.
 */
async function resumeStationaryTimer(reminder: Reminder): Promise<void> {
  const lastReadingAt = reminder.lastStationaryReadingAt
    ? new Date(reminder.lastStationaryReadingAt).getTime()
    : null;
  const elapsed = lastReadingAt === null ? 0 : Date.now() - lastReadingAt;

  const transferable = lastReadingAt !== null && elapsed > 0 && elapsed <= MAX_STATIONARY_RECOVERY_GAP_MS;

  stationaryService.resumeArrivalCandidate(
    reminder.id,
    reminder.latitude,
    reminder.longitude,
    reminder.radiusMeters,
    transferable ? elapsed : 0,
    transferable ? new Date(lastReadingAt as number) : null,
  );

  log.info('stationary', 'Resumed candidate', {
    reminderId: reminder.id,
    transferable,
    transferredMs: transferable ? elapsed : 0,
  });

  startSampling(reminder.id);
}

/**
 * Feed a location sample into stationary qualification.
 * Returns true when the stationary requirement is met.
 */
export function processLocationSample(reminderId: string, sample: LocationSample): boolean {
  const triggered = stationaryService.processLocationSample(reminderId, sample);

  // Record why the sample did or did not count. This is the only way to tell a "user kept
  // walking" reset apart from "GPS accuracy too poor" or "gap too long" after the fact.
  const evaluation = stationaryService.getLastEvaluation(reminderId);
  if (evaluation) {
    const now = Date.now();
    const lastLogged = lastSampleLogRef.get(reminderId);
    const verdictChanged = lastSampleVerdictRef.get(reminderId) !== evaluation.verdict;
    const dueForHeartbeat = !lastLogged || now - lastLogged > SAMPLE_LOG_INTERVAL_MS;

    if (verdictChanged || dueForHeartbeat || triggered) {
      lastSampleLogRef.set(reminderId, now);
      lastSampleVerdictRef.set(reminderId, evaluation.verdict);
      log.debug('stationary', 'Sample evaluated', {
        reminderId,
        verdict: evaluation.verdict,
        accuracy: evaluation.accuracy,
        speedMps: evaluation.speedMps === null ? null : Number(evaluation.speedMps.toFixed(3)),
        gapMs: evaluation.gapMs,
        accumulatedMs: evaluation.accumulatedMs,
        requiredMs: evaluation.requiredMs,
      });
    }
  }

  // Best-effort crash-safety persistence (schema v2 columns).
  void store
    .updateStationaryReading(reminderId, {
      readingAt: sample.timestamp,
      latitude: sample.latitude,
      longitude: sample.longitude,
    })
    .catch(error => {
      log.warn('stationary', 'Failed to persist stationary reading', {
        reminderId,
        error: String(error),
      });
    });

  if (triggered) {
    void triggerArrival(reminderId, 'stationary qualification');
  }

  return triggered;
}

/** Transition to TRIGGERED and show the notification. Idempotent. */
async function triggerArrival(
  reminderId: string,
  reason: string,
  options: { notify?: boolean } = {},
): Promise<void> {
  const reminder = await store.findById(reminderId);
  if (!reminder) return;

  if (reminder.status === ReminderStatus.TRIGGERED) {
    log.debug('arrival', 'Already triggered — ignoring', { reminderId, reason });
    return;
  }

  if (
    reminder.status !== ReminderStatus.ARRIVAL_PENDING &&
    reminder.status !== ReminderStatus.ARMED
  ) {
    log.info('arrival', 'Trigger refused for status', { reminderId, status: reminder.status, reason });
    return;
  }

  log.info('arrival', 'Arrival triggered', { reminderId, reason, fromStatus: reminder.status });

  const updated: Reminder = {
    ...reminder,
    status: ReminderStatus.TRIGGERED,
    updatedAt: new Date().toISOString(),
    triggeredAt: new Date().toISOString(),
  };

  await store.save(updated);

  // A native DWELL already posted the notification from the receiver (the app may have been
  // dead at that moment). Re-notifying here would show the alert twice.
  const shouldNotify = options.notify !== false;
  if (shouldNotify) {
    try {
      await scheduleReminderNotification(updated);
      log.info('arrival', 'Arrival notification displayed', { reminderId });
    } catch (error) {
      log.error('arrival', 'Failed to display arrival notification', {
        reminderId,
        error: String(error),
      });
    }
  } else {
    log.info('arrival', 'Notification skipped — native layer already posted it', { reminderId });
  }

  onStatusChange?.(reminderId, ReminderStatus.TRIGGERED);
  onArrivalTriggered?.(reminderId);

  cancelArrivalCandidate(reminderId);
}

// ---------------------------------------------------------------------------
// Reconciliation with the current position
// ---------------------------------------------------------------------------

function getCurrentPositionOnce(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise(resolve => {
    Geolocation.getCurrentPosition(
      position =>
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      error => {
        log.warn('reconcile', 'Could not read current position', { error: String(error) });
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: RECONCILE_MAX_AGE_MS },
    );
  });
}

/**
 * Re-derive status from the current position.
 *
 * Native transitions can be missed entirely (permission revoked, region dropped by the OS,
 * events from a build that did not persist them). Reconciliation is the safety net: it runs on
 * start and on every resume, and fixes statuses that no longer match reality.
 */
export function reconcileActiveReminders(reason: string): Promise<void> {
  if (reconcileInFlight) return reconcileInFlight;

  reconcileInFlight = (async () => {
    try {
      const position = await getCurrentPositionOnce();
      if (!position) return;

      const activeReminders = await store.findActive();
      const relevant = activeReminders.filter(
        reminder =>
          reminder.status === ReminderStatus.ARMED ||
          reminder.status === ReminderStatus.ARRIVAL_PENDING ||
          reminder.status === ReminderStatus.WAITING_FOR_EXIT,
      );

      log.info('reconcile', 'Reconciling active reminders', {
        reason,
        count: relevant.length,
        position,
      });

      for (const reminder of relevant) {
        const distance = haversineDistance(
          position.latitude,
          position.longitude,
          reminder.latitude,
          reminder.longitude,
        );
        const inside = distance <= reminder.radiusMeters;

        log.info('reconcile', inside ? 'Inside geofence' : 'Outside geofence', {
          reminderId: reminder.id,
          status: reminder.status,
          distanceMeters: Math.round(distance),
          radiusMeters: reminder.radiusMeters,
        });

        await applyTransition(
          reminder,
          inside ? GeofenceEventType.ENTER : GeofenceEventType.EXIT,
          `reconcile:${reason}`,
        );
      }
    } catch (error) {
      log.error('reconcile', 'Reconciliation failed', { reason, error: String(error) });
    } finally {
      reconcileInFlight = null;
    }
  })();

  return reconcileInFlight;
}

// ---------------------------------------------------------------------------
// Diagnostics + teardown
// ---------------------------------------------------------------------------

export function getActiveCandidates(): StationaryCandidate[] {
  return stationaryService.listCandidates();
}

export async function clearAllGeofences(): Promise<void> {
  for (const reminderId of Array.from(registeredGeofences.keys())) {
    await unregisterReminderGeofence(reminderId);
  }

  stationaryService.clearAll();
  pauseArrivalSampling();
  stopForegroundDrainTimer();

  appStateSubscription?.remove();
  appStateSubscription = null;

  nativeQueueSubscription?.remove();
  nativeQueueSubscription = null;

  initialized = false;
  onStatusChange = null;
  onArrivalTriggered = null;
  onStationaryUpdate = null;

  log.info('geofence', 'All geofences cleared');
}

export { stationaryService, registeredGeofences };
