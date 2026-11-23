// Persistent application log.
//
// Core geofencing behaviour happens while the app is backgrounded or dead, so the only way to
// diagnose it is to keep a durable trail. Logs live in the same SQLite database as reminders,
// are written in batches off the JS thread's critical path, and are trimmed by age and by count.

import { getDatabase } from './database';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  /** ISO timestamp of the event. */
  at: string;
  level: LogLevel;
  /** Short subsystem tag, e.g. `geofence`, `stationary`, `store`. */
  tag: string;
  message: string;
  /** Optional JSON payload, already stringified and size-capped. */
  data: string | null;
}

export interface LogEntry extends LogRecord {
  id: number;
}

/** Hard cap on stored rows — older rows are dropped first. */
const MAX_ROWS = 5000;
/** Rows older than this are purged on init. */
const RETENTION_DAYS = 14;

/** Guard against a single log line carrying a huge payload. */
const MAX_DATA_CHARS = 2000;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    at TEXT NOT NULL,
    level TEXT NOT NULL,
    tag TEXT NOT NULL,
    message TEXT NOT NULL,
    data TEXT
  )
`;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getDatabase();
      await db.execute(CREATE_TABLE_SQL);
      await db.execute('CREATE INDEX IF NOT EXISTS idx_app_logs_at ON app_logs (at)');
    })().catch(error => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

/** Append many records in one transaction. */
export async function insertLogs(records: LogRecord[]): Promise<void> {
  if (records.length === 0) return;

  await ensureSchema();
  const db = getDatabase();

  await db.transaction(async tx => {
    for (const record of records) {
      await tx.execute(
        'INSERT INTO app_logs (at, level, tag, message, data) VALUES (?, ?, ?, ?, ?)',
        [record.at, record.level, record.tag, record.message, record.data],
      );
    }
  });
}

/** Most recent entries. `oldestFirst` returns them in chronological order. */
export async function findRecentLogs(limit = 500, oldestFirst = false): Promise<LogEntry[]> {
  await ensureSchema();
  const db = getDatabase();
  // Always take the newest `limit` rows; ordering for display happens after.
  const result = await db.execute(
    'SELECT * FROM app_logs ORDER BY id DESC LIMIT ?',
    [limit],
  );

  const rows = result.rows ?? [];
  const entries: LogEntry[] = rows.map(row => ({
    id: row.id as number,
    at: row.at as string,
    level: row.level as LogLevel,
    tag: row.tag as string,
    message: row.message as string,
    data: (row.data as string) ?? null,
  }));

  return oldestFirst ? entries.reverse() : entries;
}

export async function countLogs(): Promise<number> {
  await ensureSchema();
  const db = getDatabase();
  const result = await db.execute('SELECT COUNT(*) AS total FROM app_logs');
  return (result.rows?.[0]?.total as number) ?? 0;
}

/** Delete rows older than the retention window. */
export async function purgeOldLogs(retentionDays = RETENTION_DAYS): Promise<void> {
  await ensureSchema();
  const db = getDatabase();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
  await db.execute('DELETE FROM app_logs WHERE at < ?', [cutoff]);
}

/** Keep only the newest `MAX_ROWS` rows. */
export async function trimLogs(maxRows = MAX_ROWS): Promise<void> {
  await ensureSchema();
  const db = getDatabase();
  await db.execute(
    'DELETE FROM app_logs WHERE id NOT IN (SELECT id FROM app_logs ORDER BY id DESC LIMIT ?)',
    [maxRows],
  );
}

export async function deleteAllLogs(): Promise<void> {
  await ensureSchema();
  const db = getDatabase();
  await db.execute('DELETE FROM app_logs');
}

export { MAX_DATA_CHARS, MAX_ROWS, RETENTION_DAYS };
