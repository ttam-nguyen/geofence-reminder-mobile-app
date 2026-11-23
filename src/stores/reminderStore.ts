// Reminder store — singleton in-memory repository for the current session.
// Before Phase 8 (SQLite), this provides persistence across screen navigation.

import { ReminderRepository, InMemoryReminderRepository } from "../models/repository";
import { SQLiteReminderRepository } from "../models/sqliteAdapter";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { determineInitialStatus } from "../models/initialStatus";
import { notificationService } from "../services/notificationService";
import * as geofencingService from "../services/geofencingService";
import { log } from "../services/logger";

/** Singleton repository instance shared across all screens. */
let delegate: ReminderRepository;
try {
  delegate = new SQLiteReminderRepository();
} catch (err) {
  console.warn('[Store] OP-SQLite unavailable, falling back to in-memory store:', err);
  delegate = new InMemoryReminderRepository();
}

/** Version counter — increments on every save/delete. */
let _version = 0;

/** Get the current store version (for forcing re-renders). */
export function getStoreVersion(): number {
  return _version;
}

type Listener = () => void;
let listeners: Listener[] = [];

export function subscribe(listener: Listener) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  listeners.forEach(listener => listener());
}

/** Schedule a notification for an active reminder. */
export async function scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
  try {
    const settings = await notificationService.checkPermission();
    if (settings !== 'authorized') {
      return null;
    }

    const body = reminder.description || `Reminder at ${reminder.locationName || 'this location'}`;

    const notificationId = await notificationService.scheduleNotification({
      id: reminder.id,
      title: reminder.title,
      body,
      data: { reminderId: reminder.id, type: 'reminder' },
      trigger: 'immediate',
      android: {
        channelId: 'gps_reminder_default',
        sound: reminder.notificationSoundEnabled ? 'default' : null,
        importance: 3, // HIGH
      },
      ios: {
        sound: reminder.notificationSoundEnabled ? 'default' : null,
      },
    });

    // Update the reminder with its notificationId so we can cancel later.
    const updated = { ...reminder, notificationId, updatedAt: new Date().toISOString() };
    await delegate.save(updated);
    return notificationId;
  } catch (err) {
    console.warn('[Store] Failed to schedule notification for reminder', reminder.id, err);
    return null;
  }
}

/** Cancel the notification associated with a reminder. */
async function cancelReminderNotification(reminder: Reminder): Promise<void> {
  if (reminder.notificationId) {
    try {
      await notificationService.cancelNotification(reminder.notificationId);
    } catch (err) {
      console.warn('[Store] Failed to cancel notification for reminder', reminder.id, err);
    }
  }
}

/** Save a reminder and bump the version (triggers re-renders). */
async function save(
  reminder: Reminder,
  userPosition?: { latitude: number; longitude: number },
): Promise<Reminder> {
  console.log("[Store] Saving reminder:", reminder);

  // Get the previous status for geofence reconciliation.
  const existing = await delegate.findById(reminder.id);
  const previousStatus = existing?.status ?? ReminderStatus.DRAFT;

  // Cancel any existing notification if the reminder is being deactivated.
  const inactiveStatuses: ReminderStatus[] = [
    ReminderStatus.COMPLETED,
    ReminderStatus.PAUSED,
    ReminderStatus.CANCELLED,
    ReminderStatus.DELETED,
  ];
  if (inactiveStatuses.includes(reminder.status)) {
    await cancelReminderNotification(reminder);

    // Unregister native geofence when reminder becomes inactive.
    await geofencingService.unregisterReminderGeofence(reminder.id);
  }

  // Terminal statuses must never be recomputed.
  const terminalStatuses: ReminderStatus[] = [
    ReminderStatus.TRIGGERED,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
    ReminderStatus.PAUSED,
    ReminderStatus.DELETED,
  ];

  // Recompute status only when creating a new reminder (DRAFT) or when the
  // reminder's target location changed. Otherwise preserve the passed-in
  // status so native transitions (ARMED → ARRIVAL_PENDING, etc.) survive.
  const locationChanged =
    existing == null ||
    existing.latitude !== reminder.latitude ||
    existing.longitude !== reminder.longitude;

  const shouldRecomputeStatus =
    !terminalStatuses.includes(reminder.status) &&
    (reminder.status === ReminderStatus.DRAFT || locationChanged);

  if (shouldRecomputeStatus) {
    const { latitude: userLat, longitude: userLon } =
      userPosition ?? { latitude: 0, longitude: 0 };
    const initial = determineInitialStatus(
      userLat,
      userLon,
      reminder.latitude,
      reminder.longitude,
      reminder.radiusMeters,
    );
    reminder = { ...reminder, status: initial };
  }

  const result = await delegate.save(reminder);

  if (previousStatus !== result.status) {
    log.info("store", `Status ${previousStatus} → ${result.status}`, {
      reminderId: result.id,
      userPosition: userPosition ?? null,
    });
  }

  // Register a native geofence for every status that can still transition.
  // WAITING_FOR_EXIT matters: a reminder created while the user is already inside its
  // radius stays in that state until the OS reports an EXIT, so the fence must be live.
  const registeredStatuses: ReminderStatus[] = [
    ReminderStatus.ARMED,
    ReminderStatus.WAITING_FOR_EXIT,
    ReminderStatus.ARRIVAL_PENDING,
  ];
  if (registeredStatuses.includes(result.status)) {
    await geofencingService.registerReminderGeofence(result, userPosition);
  }

  // Handle status transitions: active → inactive (unregister geofence).
  if (registeredStatuses.includes(previousStatus) && !registeredStatuses.includes(result.status)) {
    await geofencingService.unregisterReminderGeofence(result.id);
  }

  _version++;
  notifyListeners();
  return result;
}

/** Delete a reminder by ID and bump the version (triggers re-renders). */
async function deleteById(id: string): Promise<boolean> {
  const existing = await delegate.findById(id);

  // Unregister native geofence before deleting.
  if (existing) {
    await geofencingService.unregisterReminderGeofence(id);
  }

  const result = await delegate.deleteById(id);
  if (result) _version++;
  notifyListeners();
  return result;
}

/**
 * Purge any previously-persisted mock/seeded reminders. Earlier builds seeded
 * mock rows on startup; devices that ran those builds may still have them
 * persisted. This runs once at import time and is idempotent.
 */
export const storeReady: Promise<void> = (async () => {
  try {
    const all = await delegate.findAll();
    const mockIds = all.filter(r => r.id.startsWith('mock-')).map(r => r.id);
    for (const id of mockIds) {
      await delegate.deleteById(id);
    }
  } catch (err) {
    // A purge failure must never block startup.
    console.warn('[Store] Failed to purge mock reminders:', err);
  }
})();

/**
 * Update an existing reminder's properties.
 * Status is preserved unless the target location changed, in which case it is
 * recalculated from the user's current GPS position.
 */
export async function updateReminder(
  updated: Reminder,
  userPosition?: { latitude: number; longitude: number },
): Promise<Reminder> {
  const existing = await delegate.findById(updated.id);
  if (!existing) {
    throw new Error(`Reminder ${updated.id} not found`);
  }

  const terminalStatuses: ReminderStatus[] = [
    ReminderStatus.TRIGGERED,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
    ReminderStatus.PAUSED,
    ReminderStatus.DELETED,
  ];

  const locationChanged =
    existing.latitude !== updated.latitude ||
    existing.longitude !== updated.longitude;

  const shouldRecomputeStatus =
    !terminalStatuses.includes(updated.status) &&
    (updated.status === ReminderStatus.DRAFT || locationChanged);

  let status: ReminderStatus = updated.status;
  if (shouldRecomputeStatus) {
    const { latitude: userLat, longitude: userLon } =
      userPosition ?? { latitude: 0, longitude: 0 };
    status = determineInitialStatus(
      userLat,
      userLon,
      updated.latitude,
      updated.longitude,
      updated.radiusMeters,
    );
  }

  const result: Reminder = {
    ...updated,
    status,
    notificationId: existing.notificationId,
  };

  const saved = await delegate.save(result);

  // Register geofence for active statuses.
  const activeStatuses: ReminderStatus[] = [
    ReminderStatus.ARMED,
    ReminderStatus.ARRIVAL_PENDING,
  ];
  if (activeStatuses.includes(result.status)) {
    await geofencingService.registerReminderGeofence(result, userPosition);
  }

  _version++;
  notifyListeners();
  return saved;
}

// Re-export the delegate as 'store' for compatibility.
export const store: ReminderRepository = {
  findById: delegate.findById.bind(delegate),
  findAll: delegate.findAll.bind(delegate),
  save,
  deleteById,
  findActive: delegate.findActive.bind(delegate),
  findByStatus: delegate.findByStatus.bind(delegate),
  clear: delegate.clear.bind(delegate),
  updateStationaryReading: delegate.updateStationaryReading.bind(delegate),
};
