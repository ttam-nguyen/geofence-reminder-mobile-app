// Reminder store — singleton in-memory repository for the current session.
// Before Phase 8 (SQLite), this provides persistence across screen navigation.

import { InMemoryReminderRepository, ReminderRepository } from "../models/repository";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { determineInitialStatus } from "../models/initialStatus";

/** Singleton repository instance shared across all screens. */
const delegate: ReminderRepository = new InMemoryReminderRepository();

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

/** Save a reminder and bump the version (triggers re-renders). */
async function save(reminder: Reminder): Promise<Reminder> {
  console.log("[Store] Saving reminder:", reminder);

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
seed().catch(() => {
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
