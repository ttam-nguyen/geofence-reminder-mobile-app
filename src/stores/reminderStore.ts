// Reminder store — singleton in-memory repository for the current session.
// Before Phase 8 (SQLite), this provides persistence across screen navigation.

import { InMemoryReminderRepository, ReminderRepository } from '../models/repository';
import { Reminder } from '../types/Reminder';

/** Singleton repository instance shared across all screens. */
const delegate: ReminderRepository = new InMemoryReminderRepository();

/** Version counter — increments on every save/delete. */
let _version = 0;

/** Get the current store version (for forcing re-renders). */
export function getStoreVersion(): number {
  return _version;
}

/** Save a reminder and bump the version (triggers re-renders). */
async function save(reminder: Reminder): Promise<Reminder> {
  const result = await delegate.save(reminder);
  _version++;
  return result;
}

/** Delete a reminder by ID and bump the version (triggers re-renders). */
async function deleteById(id: string): Promise<boolean> {
  const result = await delegate.deleteById(id);
  if (result) _version++;
  return result;
}

/** Seed the store with mock reminders for initial UI development. */
async function seed(): Promise<void> {
  const { mockReminders } = await import('../data/mockReminders');
  for (const reminder of mockReminders) {
    await save(reminder);
  }
}

// Seed on first import (only runs once).
seed().catch(() => { /* ignore seeding errors */ });

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
