// Shared SQLite connection.
//
// One connection per process. Several repositories (reminders, logs) write to the same
// database file, and SQLite serialises writers per connection — sharing it avoids
// "database is locked" errors between them.

import { open } from '@op-engineering/op-sqlite';

export const DATABASE_NAME = 'gps-reminder.db';

let connection: ReturnType<typeof open> | null = null;

/** Get (or create) the process-wide database connection. */
export function getDatabase(): ReturnType<typeof open> {
  if (!connection) {
    connection = open({ name: DATABASE_NAME });
  }
  return connection;
}

/** Close the connection (tests, or a full reset). */
export function closeDatabase(): void {
  if (!connection) return;
  try {
    connection.close();
  } finally {
    connection = null;
  }
}
