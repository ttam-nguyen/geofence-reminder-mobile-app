/**
 * SQLite database adapter for reminder persistence.
 *
 * Uses react-native-sqlite-storage with promise-based API.
 * Creates and manages the schema for reminders, events, and notification logs.
 */

import SQLite from 'react-native-sqlite-storage';

// Enable promise-based API (required for async/await)
SQLite.enablePromise(true);

const DB_NAME = 'geofence_reminders.db';

/** Opens (or reuses) the database. Creates tables if they don't exist. */
export async function openDatabase(): Promise<ReturnType<typeof SQLite.openDatabase>> {
  if (_db) {
    return _db;
  }

  _db = await SQLite.openDatabase(
    { name: DB_NAME, location: 'default' },
    () => {}, // success callback (no-op)
  );

  await createTables();

  return _db;
}

/** Closes the database connection. */
export async function closeDatabase(): Promise<void> {
  if (!_db) return;

  await _db.close();
  _db = null;
}

/** Creates all tables if they don't exist. */
async function createTables(): Promise<void> {
  const db = _db!;

  // Reminders table — matches Reminder entity fields
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT 'Untitled Reminder',
      description TEXT,
      latitude REAL NOT NULL DEFAULT 0,
      longitude REAL NOT NULL DEFAULT 0,
      locationName TEXT,
      radiusMeters INTEGER NOT NULL DEFAULT 50,
      locationSource TEXT NOT NULL DEFAULT 'current_gps',
      status TEXT NOT NULL DEFAULT 'DRAFT',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      triggeredAt TEXT,
      completedAt TEXT,
      notificationSoundEnabled INTEGER NOT NULL DEFAULT 1,
      notificationVibrationEnabled INTEGER NOT NULL DEFAULT 1
    )
  `);

  // Reminder events table — diagnostic event log
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS reminder_events (
      id TEXT PRIMARY KEY,
      reminderId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      previousStatus TEXT,
      newStatus TEXT,
      outcome TEXT NOT NULL DEFAULT 'PENDING',
      details TEXT,
      FOREIGN KEY (reminderId) REFERENCES reminders(id) ON DELETE CASCADE
    )
  `);

  // Index for fast lookup by reminder ID
  await db.executeSql(
    'CREATE INDEX IF NOT EXISTS idx_events_reminder ON reminder_events(reminderId)',
  );

  // Notification delivery records table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS notification_delivery_records (
      id TEXT PRIMARY KEY,
      reminderId TEXT NOT NULL,
      notificationId TEXT NOT NULL,
      scheduledAt TEXT NOT NULL,
      deliveredAt TEXT,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      failureReason TEXT,
      FOREIGN KEY (reminderId) REFERENCES reminders(id) ON DELETE CASCADE
    )
  `);

  // Index for fast lookup by reminder ID
  await db.executeSql(
    'CREATE INDEX IF NOT EXISTS idx_notifications_reminder ON notification_delivery_records(reminderId)',
  );

  // Index for pending (undelivered) notifications
  await db.executeSql(
    "CREATE INDEX IF NOT EXISTS idx_notifications_pending ON notification_delivery_records(status) WHERE status = 'SCHEDULED'",
  );
}

/** Returns the current database instance (must call openDatabase first). */
export function getDb(): ReturnType<typeof SQLite.openDatabase> | null {
  return _db;
}

let _db: ReturnType<typeof SQLite.openDatabase> | null = null;