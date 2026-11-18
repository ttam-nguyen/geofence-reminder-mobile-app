/**
 * GeofencingService — TypeScript service layer for native geofence integration.
 *
 * This service:
 * 1. Registers/unregisters native geofences via the native module bridge.
 * 2. Listens for native ENTER/EXIT events from both platforms.
 * 3. Manages arrival candidates (stationary qualification).
 * 4. Integrates with the state machine for status transitions.
 *
 * Architecture:
 * - On reminder save (status change): register or unregister native geofence.
 * - On native ENTER event: processGeofenceEvent() → ARMED → ARRIVAL_PENDING.
 *   Start stationary qualification (bounded location updates).
 * - On native EXIT event: processGeofenceEvent() → ARRIVAL_PENDING → ARMED.
 *   Cancel stationary qualification.
 * - StationaryService: speed < 2 mph for 120s → TRIGGERED (notify user).
 * - Speed ≥ 2 mph or geofence exit → reset to ARMED.
 */

import { NativeEventEmitter, NativeModules } from 'react-native';
import { ReminderStatus, Reminder } from '../types/Reminder';
import { processGeofenceEvent, GeofenceEventType } from '../models/eventProcessor';
import { store } from '../stores/reminderStore';
import { StationaryService, StationaryCandidate } from './stationaryService';
import type { LocationSample } from '../types/location';

const GeofencingModule = NativeModules.GeofencingModule as any;

const nativeEventEmitter = new NativeEventEmitter(GeofencingModule);

// Event names (matching native modules).
const GEOFENCE_ENTER_EVENT = 'geofenceEnter';
const GEOFENCE_EXIT_EVENT = 'geofenceExit';

export interface GeofenceInfo {
  reminderId: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface GeofenceEvent {
  reminderId: string;
  transitionType: number; // 1=ENTER, 2=EXIT, 4=DWELL
  latitude?: number;
  longitude?: number;
}

// Constants matching production spec.
export const TRANSITION_ENTER = 1;
export const TRANSITION_EXIT = 2;
export const TRANSITION_DWELL = 4;

// Geofence registration state (reminderId → Reminder).
const registeredGeofences = new Map<string, Reminder>();

// Stationary service for arrival detection.
const stationaryService = new StationaryService();

// Callbacks for geofence events (set by the app).
let onStatusChange: ((reminderId: string, newStatus: ReminderStatus) => void) | null = null;
let onArrivalTriggered: ((reminderId: string) => void) | null = null;
let onStationaryUpdate: ((reminderId: string, remainingMs: number) => void) | null = null;

// Interval IDs for stationary update polling (reminderId → intervalId).
const updateIntervals = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Initialize the geofencing service. Sets up native event listeners.
 * Call once at app startup (in App.tsx or root component).
 */
export function initGeofencingService(): void {
  // Listen for native ENTER events.
  (nativeEventEmitter.addListener as any)(
    GEOFENCE_ENTER_EVENT,
    (event: GeofenceEvent) => handleNativeEnter(event)
  );

  // Listen for native EXIT events.
  (nativeEventEmitter.addListener as any)(
    GEOFENCE_EXIT_EVENT,
    (event: GeofenceEvent) => handleNativeExit(event)
  );

  // Re-register geofences for all active reminders on startup.
  registerAllActiveGeofences().catch(err => {
    console.error('[GeofencingService] Failed to re-register active geofences on startup:', err);
  });
}

/**
 * Set the callback for status changes triggered by geofence events.
 */
export function setOnStatusChange(callback: (reminderId: string, newStatus: ReminderStatus) => void): void {
  onStatusChange = callback;
}

/**
 * Set the callback when arrival is triggered (stationary qualification met).
 */
export function setOnArrivalTriggered(callback: (reminderId: string) => void): void {
  onArrivalTriggered = callback;
}

/**
 * Set the callback for stationary time updates (remaining seconds).
 */
export function setOnStationaryUpdate(callback: (reminderId: string, remainingMs: number) => void): void {
  onStationaryUpdate = callback;
}

/**
 * Register a geofence for a reminder (called when status is ARMED or WAITING_FOR_EXIT).
 */
export async function registerReminderGeofence(reminder: Reminder): Promise<void> {
  if (reminder.status !== ReminderStatus.ARMED && reminder.status !== ReminderStatus.WAITING_FOR_EXIT) {
    return; // Only register active reminders.
  }

  try {
    await GeofencingModule.registerGeofence(reminder.id, reminder.latitude, reminder.longitude, reminder.radiusMeters);
    registeredGeofences.set(reminder.id, reminder);
  } catch (error) {
    console.error(`[GeofencingService] Failed to register geofence for ${reminder.id}:`, error);
  }
}

/**
 * Unregister a geofence for a reminder (called when status becomes inactive).
 */
export async function unregisterReminderGeofence(reminderId: string): Promise<void> {
  try {
    await GeofencingModule.unregisterGeofence(reminderId);
    registeredGeofences.delete(reminderId);
  } catch (error) {
    console.error(`[GeofencingService] Failed to unregister geofence for ${reminderId}:`, error);
  }
}

/**
 * Register geofences for all active (ARMED/WAITING_FOR_EXIT) reminders.
 * Called on cold start to re-register after app restart.
 */
export async function registerAllActiveGeofences(): Promise<void> {
  const activeReminders = await store.findActive();

  for (const reminder of activeReminders) {
    await registerReminderGeofence(reminder);
  }
}

/**
 * List all registered geofences (for diagnostics/developer tools).
 */
export async function listRegisteredGeofences(): Promise<GeofenceInfo[]> {
  try {
    return await GeofencingModule.listRegisteredGeofences();
  } catch {
    // Fallback: return our tracked list if native module is unavailable.
    const result: GeofenceInfo[] = [];
    for (const reminder of registeredGeofences.values()) {
      result.push({
        reminderId: reminder.id,
        latitude: reminder.latitude,
        longitude: reminder.longitude,
        radius: reminder.radiusMeters,
      });
    }
    return result;
  }
}

/**
 * Check location permission status.
 */
export async function getAuthorizationStatus(): Promise<string> {
  try {
    return await GeofencingModule.getAuthorizationStatus();
  } catch {
    return 'unknown'; // Fallback when native module is unavailable.
  }
}

/**
 * Request location permission from the user.
 */
export async function requestLocationPermission(): Promise<void> {
  try {
    await GeofencingModule.requestLocationPermission();
  } catch (error) {
    console.error('[GeofencingService] Failed to request location permission:', error);
  }
}

/**
 * Handle a native geofence ENTER event.
 */
async function handleNativeEnter(event: GeofenceEvent): Promise<void> {
  const { reminderId } = event;

  // Get the current reminder from the store.
  const reminder = await store.findById(reminderId);
  if (!reminder) {
    console.warn(`[GeofencingService] ENTER event for unknown reminder ${reminderId}`);
    return;
  }

  // Process through state machine.
  try {
    const result = processGeofenceEvent(reminder.status, GeofenceEventType.ENTER);

    if (result.transitioned) {
      const updatedReminder: Reminder = { ...reminder, status: result.newStatus, updatedAt: new Date().toISOString() };
      await store.save(updatedReminder);

      // Notify subscribers.
      if (onStatusChange) {
        onStatusChange(reminderId, result.newStatus);
      }

      // If ARRIVAL_PENDING — start stationary qualification.
      if (result.newStatus === ReminderStatus.ARRIVAL_PENDING) {
        startArrivalCandidate(reminderId, reminder.latitude, reminder.longitude, reminder.radiusMeters);
      }
    }
  } catch (error) {
    console.error(`[GeofencingService] Failed to process ENTER for ${reminderId}:`, error);
  }
}

/**
 * Handle a native geofence EXIT event.
 */
async function handleNativeExit(event: GeofenceEvent): Promise<void> {
  const { reminderId } = event;

  // Get the current reminder from the store.
  const reminder = await store.findById(reminderId);
  if (!reminder) {
    console.warn(`[GeofencingService] EXIT event for unknown reminder ${reminderId}`);
    return;
  }

  // Process through state machine.
  try {
    const result = processGeofenceEvent(reminder.status, GeofenceEventType.EXIT);

    if (result.transitioned) {
      const updatedReminder: Reminder = { ...reminder, status: result.newStatus, updatedAt: new Date().toISOString() };
      await store.save(updatedReminder);

      // Notify subscribers.
      if (onStatusChange) {
        onStatusChange(reminderId, result.newStatus);
      }

      // If back to ARMED — cancel stationary qualification.
      if (result.newStatus === ReminderStatus.ARMED) {
        cancelArrivalCandidate(reminderId);
      }
    }
  } catch (error) {
    console.error(`[GeofencingService] Failed to process EXIT for ${reminderId}:`, error);
  }
}

/**
 * Start stationary qualification for an arrival candidate.
 */
function startArrivalCandidate(reminderId: string, lat: number, lon: number, radiusMeters: number): void {
  stationaryService.startArrivalCandidate(reminderId, lat, lon, radiusMeters);

  // Start emitting stationary updates to UI.
  const intervalId = setInterval(() => {
    const remainingMs = stationaryService.getRemainingStationaryTimeMs(reminderId);
    if (remainingMs !== null && onStationaryUpdate) {
      onStationaryUpdate(reminderId, remainingMs);
    }
  }, 1000); // Update every second for UI feedback.

  updateIntervals.set(reminderId, intervalId);
}

/**
 * Cancel stationary qualification for a reminder.
 */
function cancelArrivalCandidate(reminderId: string): void {
  stationaryService.cancelArrivalCandidate(reminderId);

  // Clean up the polling interval.
  const intervalId = updateIntervals.get(reminderId);
  if (intervalId) {
    clearInterval(intervalId);
    updateIntervals.delete(reminderId);
  }
}

/**
 * Process a location sample for stationary qualification.
 * Returns true if the user has been stationary long enough to trigger arrival.
 */
export function processLocationSample(reminderId: string, sample: LocationSample): boolean {
  const triggered = stationaryService.processLocationSample(reminderId, sample);

  if (triggered) {
    // Stationary qualification met — transition to TRIGGERED.
    triggerArrival(reminderId);
  }

  return triggered;
}

/**
 * Trigger an arrival notification (stationary qualification met).
 */
async function triggerArrival(reminderId: string): Promise<void> {
  const reminder = await store.findById(reminderId);
  if (!reminder) return;

  try {
    const updatedReminder: Reminder = {
      ...reminder,
      status: ReminderStatus.TRIGGERED,
      updatedAt: new Date().toISOString(),
      triggeredAt: new Date().toISOString(),
    };
    await store.save(updatedReminder);

    if (onStatusChange) {
      onStatusChange(reminderId, ReminderStatus.TRIGGERED);
    }

    if (onArrivalTriggered) {
      onArrivalTriggered(reminderId);
    }

    // Cancel the arrival candidate.
    stationaryService.cancelArrivalCandidate(reminderId);
  } catch (error) {
    console.error(`[GeofencingService] Failed to trigger arrival for ${reminderId}:`, error);
  }
}

/**
 * Get all active arrival candidates (for diagnostics).
 */
export function getActiveCandidates(): StationaryCandidate[] {
  return stationaryService.listCandidates();
}

/**
 * Clear all geofencing state (called on app exit or logout).
 */
export async function clearAllGeofences(): Promise<void> {
  for (const reminder of registeredGeofences.keys()) {
    await unregisterReminderGeofence(reminder);
  }
  stationaryService.clearAll();

  // Clean up all polling intervals.
  for (const intervalId of updateIntervals.values()) {
    clearInterval(intervalId);
  }
  updateIntervals.clear();

  if (onStatusChange) {
    onStatusChange = null;
  }
  if (onArrivalTriggered) {
    onArrivalTriggered = null;
  }
  if (onStationaryUpdate) {
    onStationaryUpdate = null;
  }
}

export { stationaryService, registeredGeofences };
