// Reminder store — singleton in-memory repository for the current session.
// Before Phase 8 (SQLite), this provides persistence across screen navigation.

import { ReminderRepository, InMemoryReminderRepository } from "../models/repository";
import { SQLiteReminderRepository } from "../models/sqliteAdapter";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { determineInitialStatus } from "../models/initialStatus";
import { notificationService } from "../services/notificationService";

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
async function scheduleReminderNotification(reminder: Reminder): Promise<string | null> {
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
      data: { reminderId: reminder.id },
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
async function save(reminder: Reminder): Promise<Reminder> {
  console.log("[Store] Saving reminder:", reminder);

  // Cancel any existing notification if the reminder is being deactivated.
  const inactiveStatuses: ReminderStatus[] = [
    ReminderStatus.COMPLETED,
    ReminderStatus.PAUSED,
    ReminderStatus.CANCELLED,
    ReminderStatus.DELETED,
  ];
  if (inactiveStatuses.includes(reminder.status)) {
    await cancelReminderNotification(reminder);
  }

  // Auto-activate DRAFT reminders based on geolocation.
  if (reminder.status === ReminderStatus.DRAFT) {
    const initial = determineInitialStatus(
      0,           // userLat — default (Phase 8 will pass real position)
      0,           // userLon — default (Phase 8 will pass real position)
      reminder.latitude,
      reminder.longitude,
      reminder.radiusMeters,
    );
    reminder = { ...reminder, status: initial };
  }

  const result = await delegate.save(reminder);

  // Schedule a notification for reminders that are active.
  const activeStatuses: ReminderStatus[] = [
    ReminderStatus.ARMED,
    ReminderStatus.ARRIVAL_PENDING,
  ];
  if (activeStatuses.includes(result.status)) {
    await scheduleReminderNotification(result);
  }

  _version++;
  notifyListeners();
  return result;
}

/** Delete a reminder by ID and bump the version (triggers re-renders). */
async function deleteById(id: string): Promise<boolean> {
  const result = await delegate.deleteById(id);
  if (result) _version++;
  notifyListeners();
  return result;
}

/** Seed the store with mock reminders for initial UI development. */
async function seed(): Promise<void> {
  const { mockReminders } = await import("../data/mockReminders");
  for (const reminder of mockReminders) {
    await save(reminder);
  }
}

// Seed on first import (only runs once).
export const storeReady = seed().catch(() => {
  /* ignore seeding errors */
});

// Re-export the delegate as 'store' for compatibility.
export const store: ReminderRepository = {
  findById: delegate.findById.bind(delegate),
  findAll: delegate.findAll.bind(delegate),
  save,
  deleteById,
  findActive: delegate.findActive.bind(delegate),
  findByStatus: delegate.findByStatus.bind(delegate),
  clear: delegate.clear.bind(delegate),
};
