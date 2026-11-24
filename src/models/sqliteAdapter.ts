// SQLite-backed reminder repository using OP-SQLite.

import type { QueryResult, Scalar } from '@op-engineering/op-sqlite';
import { ReminderRepository } from './repository';
import { Reminder, ReminderStatus } from '../types/Reminder';
import { getDatabase, closeDatabase } from './database';

/**
 * Schema versions:
 * 1 — initial reminders table.
 * 2 — stationary crash-safety columns.
 *
 * Column-level reconciliation below is what actually matters: `notificationId` was added to the
 * canonical schema after the first release, but the old `if (version >= 1) return` guard meant
 * existing installs never received it, so every save failed with "no column named notificationId".
 * Any column missing from a live database is now added on first use.
 */
const SCHEMA_VERSION = 2;

const CREATE_REMINDERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    locationName TEXT,
    radiusMeters INTEGER NOT NULL DEFAULT 200,
    locationSource TEXT NOT NULL DEFAULT 'current',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    triggeredAt TEXT,
    completedAt TEXT,
    notificationId TEXT,
    notificationSoundEnabled INTEGER NOT NULL DEFAULT 1,
    notificationVibrationEnabled INTEGER NOT NULL DEFAULT 1,
    lastStationaryReadingAt TEXT,
    lastStationaryReadingLat REAL,
    lastStationaryReadingLon REAL
  )
`;

/** Every column the current queries write. Missing ones are added by ALTER TABLE. */
const REQUIRED_COLUMNS: { name: string; definition: string }[] = [
  { name: 'title', definition: "TEXT NOT NULL DEFAULT ''" },
  { name: 'description', definition: 'TEXT' },
  { name: 'latitude', definition: 'REAL NOT NULL DEFAULT 0' },
  { name: 'longitude', definition: 'REAL NOT NULL DEFAULT 0' },
  { name: 'locationName', definition: 'TEXT' },
  { name: 'radiusMeters', definition: 'INTEGER NOT NULL DEFAULT 200' },
  { name: 'locationSource', definition: "TEXT NOT NULL DEFAULT 'current'" },
  { name: 'status', definition: "TEXT NOT NULL DEFAULT 'DRAFT'" },
  { name: 'createdAt', definition: "TEXT NOT NULL DEFAULT ''" },
  { name: 'updatedAt', definition: "TEXT NOT NULL DEFAULT ''" },
  { name: 'triggeredAt', definition: 'TEXT' },
  { name: 'completedAt', definition: 'TEXT' },
  { name: 'notificationId', definition: 'TEXT' },
  { name: 'notificationSoundEnabled', definition: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'notificationVibrationEnabled', definition: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'lastStationaryReadingAt', definition: 'TEXT' },
  { name: 'lastStationaryReadingLat', definition: 'REAL' },
  { name: 'lastStationaryReadingLon', definition: 'REAL' },
];

/** Columns present in `existing` but missing from the canonical set, in declaration order. */
export function computeMissingColumns(existing: string[]): { name: string; definition: string }[] {
  const present = new Set(existing);
  return REQUIRED_COLUMNS.filter(column => !present.has(column.name));
}

let schemaReady: Promise<void> | null = null;

/** Run the migration once per process, then reuse the resolved promise. */
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = applyMigrations().catch(error => {
      // Let the next call retry rather than caching the failure forever.
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

async function applyMigrations(): Promise<void> {
  const db = getDatabase();

  await db.execute(CREATE_REMINDERS_TABLE_SQL);

  // Additive reconciliation: safe for partial or hand-edited databases, and a no-op once
  // everything is present.
  const info = await db.execute('PRAGMA table_info(reminders)');
  const existing = new Set((info.rows ?? []).map(row => String(row.name)));

  if (existing.size === 0) {
    // Some builds return no rows for PRAGMA table_info. Fall back to attempting every ADD and
    // tolerating "duplicate column name", which is the only reliable signal left.
    for (const column of REQUIRED_COLUMNS) {
      try {
        await db.execute(`ALTER TABLE reminders ADD COLUMN ${column.name} ${column.definition}`);
      } catch (error) {
        const message = String(error);
        if (!message.includes('duplicate column')) {
          console.warn(`[SQLite] Could not add column ${column.name}:`, error);
        }
      }
    }
  } else {
    const missing = computeMissingColumns(Array.from(existing));
    for (const column of missing) {
      await db.execute(`ALTER TABLE reminders ADD COLUMN ${column.name} ${column.definition}`);
    }
    if (missing.length > 0) {
      console.warn(
        `[SQLite] Migrated reminders table — added ${missing.map(column => column.name).join(', ')}`,
      );
    }
  }

  const versionResult = await db.execute('PRAGMA user_version');
  const version = Number(versionResult.rows?.[0]?.user_version ?? 0);
  if (version < SCHEMA_VERSION) {
    await db.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
}

/** Convert boolean fields to SQLite INTEGER (0/1). */
function toRow(r: Reminder): Record<string, Scalar> {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? null,
    latitude: r.latitude,
    longitude: r.longitude,
    locationName: r.locationName ?? null,
    radiusMeters: r.radiusMeters,
    locationSource: r.locationSource,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    triggeredAt: r.triggeredAt ?? null,
    completedAt: r.completedAt ?? null,
    notificationId: r.notificationId ?? null,
    notificationSoundEnabled: r.notificationSoundEnabled ? 1 : 0,
    notificationVibrationEnabled: r.notificationVibrationEnabled ? 1 : 0,
    lastStationaryReadingAt: r.lastStationaryReadingAt ?? null,
    lastStationaryReadingLat: r.lastStationaryReadingLat ?? null,
    lastStationaryReadingLon: r.lastStationaryReadingLon ?? null,
  };
}

/** Convert a SQLite row back to a Reminder. */
function toReminder(row: Record<string, Scalar>): Reminder {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || null,
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    locationName: (row.locationName as string) || null,
    radiusMeters: row.radiusMeters as number,
    locationSource: row.locationSource as Reminder['locationSource'],
    status: row.status as ReminderStatus,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
    triggeredAt: (row.triggeredAt as string) || null,
    completedAt: (row.completedAt as string) || null,
    notificationId: (row.notificationId as string) || null,
    notificationSoundEnabled: (row.notificationSoundEnabled as number) === 1,
    notificationVibrationEnabled: (row.notificationVibrationEnabled as number) === 1,
    lastStationaryReadingAt: (row.lastStationaryReadingAt as string) || null,
    lastStationaryReadingLat: row.lastStationaryReadingLat == null
      ? null
      : (row.lastStationaryReadingLat as number),
    lastStationaryReadingLon: row.lastStationaryReadingLon == null
      ? null
      : (row.lastStationaryReadingLon as number),
  };
}

/** Row count helper from a QueryResult. */
function rowCount(result: QueryResult): number {
  return result.rows?.length ?? 0;
}

/** Extract rows from a QueryResult as Reminder[]. */
function toReminders(result: QueryResult): Reminder[] {
  if (!result.rows || result.rows.length === 0) return [];
  return result.rows.map(row => toReminder(row));
}

export class SQLiteReminderRepository implements ReminderRepository {
  async findById(id: string): Promise<Reminder | undefined> {
    await ensureSchema();
    const result = await getDatabase().execute('SELECT * FROM reminders WHERE id = ?', [id]);
    if (rowCount(result) === 0) return undefined;
    return toReminder(result.rows![0]);
  }

  async findAll(statusFilter?: ReminderStatus): Promise<Reminder[]> {
    await ensureSchema();
    let query = 'SELECT * FROM reminders';
    const params: string[] = [];
    if (statusFilter) {
      query += ' WHERE status = ?';
      params.push(statusFilter);
    }
    return toReminders(await getDatabase().execute(query, params));
  }

  async save(reminder: Reminder): Promise<Reminder> {
    await ensureSchema();
    const db = getDatabase();
    const now = new Date().toISOString();
    const row = toRow(reminder);

    await db.transaction(async tx => {
      // INSERT OR REPLACE keeps a single row per id; createdAt is re-written from the row so
      // callers must pass it through (reminderStore does).
      await tx.execute(
        `INSERT OR REPLACE INTO reminders (
          id, title, description, latitude, longitude, locationName,
          radiusMeters, locationSource, status, createdAt, updatedAt,
          triggeredAt, completedAt, notificationId,
          notificationSoundEnabled, notificationVibrationEnabled,
          lastStationaryReadingAt, lastStationaryReadingLat, lastStationaryReadingLon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id, row.title, row.description, row.latitude, row.longitude,
          row.locationName, row.radiusMeters, row.locationSource, row.status,
          row.createdAt, now, row.triggeredAt, row.completedAt,
          row.notificationId ?? null,
          row.notificationSoundEnabled, row.notificationVibrationEnabled,
          row.lastStationaryReadingAt, row.lastStationaryReadingLat, row.lastStationaryReadingLon,
        ],
      );
    });

    return this.findById(reminder.id) as Promise<Reminder>;
  }

  async deleteById(id: string): Promise<boolean> {
    await ensureSchema();
    const result = await getDatabase().execute('DELETE FROM reminders WHERE id = ?', [id]);
    return (result.rowsAffected ?? 0) > 0;
  }

  async findActive(): Promise<Reminder[]> {
    await ensureSchema();
    const result = await getDatabase().execute(
      "SELECT * FROM reminders WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'DELETED')",
    );
    return toReminders(result);
  }

  async findByStatus(status: ReminderStatus): Promise<Reminder[]> {
    await ensureSchema();
    const result = await getDatabase().execute(
      'SELECT * FROM reminders WHERE status = ?', [status],
    );
    return toReminders(result);
  }

  async clear(): Promise<void> {
    await ensureSchema();
    await getDatabase().execute('DELETE FROM reminders');
  }

  async updateStationaryReading(
    id: string,
    reading: { readingAt: string; latitude: number; longitude: number },
  ): Promise<Reminder | undefined> {
    await ensureSchema();
    await getDatabase().execute(
      `UPDATE reminders
         SET lastStationaryReadingAt = ?, lastStationaryReadingLat = ?, lastStationaryReadingLon = ?, updatedAt = ?
       WHERE id = ?`,
      [
        reading.readingAt,
        reading.latitude,
        reading.longitude,
        new Date().toISOString(),
        id,
      ],
    );

    return this.findById(id);
  }

  /** Close the shared database connection (useful for testing). */
  async close(): Promise<void> {
    closeDatabase();
    // A new connection needs the migration check again.
    schemaReady = null;
  }
}
