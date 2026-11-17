// SQLite-backed reminder repository using OP-SQLite.

import { open, type QueryResult, type Scalar } from '@op-engineering/op-sqlite';
import { ReminderRepository } from './repository';
import { Reminder, ReminderStatus } from '../types/Reminder';

const DB_NAME = 'gps-reminder.db';
const SCHEMA_VERSION = 1;

/** Schema version check — returns true if the DB is initialized. */
async function ensureSchema(db: ReturnType<typeof open>): Promise<void> {
  const result = await db.execute('PRAGMA user_version');
  const version = (result.rows?.[0]?.user_version as number) ?? 0;
  if (version >= SCHEMA_VERSION) return;

  await db.transaction(async tx => {
    await tx.execute(`
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
        notificationSoundEnabled INTEGER NOT NULL DEFAULT 1,
        notificationVibrationEnabled INTEGER NOT NULL DEFAULT 1
      )
    `);
    await tx.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  });
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
    notificationSoundEnabled: r.notificationSoundEnabled ? 1 : 0,
    notificationVibrationEnabled: r.notificationVibrationEnabled ? 1 : 0,
  };
}

/** Convert SQLite INTEGER fields back to boolean. */
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
    notificationSoundEnabled: (row.notificationSoundEnabled as number) === 1,
    notificationVibrationEnabled: (row.notificationVibrationEnabled as number) === 1,
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
  private db: ReturnType<typeof open> | null = null;

  private getDb(): ReturnType<typeof open> {
    if (!this.db) {
      this.db = open({ name: DB_NAME });
    }
    return this.db;
  }

  private async ensureDb(): Promise<void> {
    const db = this.getDb();
    await ensureSchema(db);
  }

  async findById(id: string): Promise<Reminder | undefined> {
    await this.ensureDb();
    const result = await this.getDb().execute(
      'SELECT * FROM reminders WHERE id = ?', [id],
    );
    if (rowCount(result) === 0) return undefined;
    return toReminder(result.rows![0]);
  }

  async findAll(statusFilter?: ReminderStatus): Promise<Reminder[]> {
    await this.ensureDb();
    const db = this.getDb();
    let query = 'SELECT * FROM reminders';
    const params: string[] = [];
    if (statusFilter) {
      query += ' WHERE status = ?';
      params.push(statusFilter);
    }
    const result = await db.execute(query, params);
    return toReminders(result);
  }

  async save(reminder: Reminder): Promise<Reminder> {
    await this.ensureDb();
    const db = this.getDb();
    const now = new Date().toISOString();
    const row = toRow(reminder);

    await db.transaction(async tx => {
      // INSERT OR REPLACE preserves createdAt but updates updatedAt.
      await tx.execute(
        `INSERT OR REPLACE INTO reminders (
          id, title, description, latitude, longitude, locationName,
          radiusMeters, locationSource, status, createdAt, updatedAt,
          triggeredAt, completedAt, notificationSoundEnabled, notificationVibrationEnabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.id, row.title, row.description, row.latitude, row.longitude,
          row.locationName, row.radiusMeters, row.locationSource, row.status,
          row.createdAt, now, row.triggeredAt, row.completedAt,
          row.notificationSoundEnabled, row.notificationVibrationEnabled,
        ],
      );
    });

    // Re-read to return the persisted version (createdAt preserved by INSERT OR REPLACE).
    return this.findById(reminder.id) as Promise<Reminder>;
  }

  async deleteById(id: string): Promise<boolean> {
    await this.ensureDb();
    const result = await this.getDb().execute(
      'DELETE FROM reminders WHERE id = ?', [id],
    );
    return (result.rowsAffected ?? 0) > 0;
  }

  async findActive(): Promise<Reminder[]> {
    await this.ensureDb();
    const result = await this.getDb().execute(
      "SELECT * FROM reminders WHERE status NOT IN ('COMPLETED', 'CANCELLED', 'DELETED')",
    );
    return toReminders(result);
  }

  async findByStatus(status: ReminderStatus): Promise<Reminder[]> {
    await this.ensureDb();
    const result = await this.getDb().execute(
      'SELECT * FROM reminders WHERE status = ?', [status],
    );
    return toReminders(result);
  }

  async clear(): Promise<void> {
    await this.ensureDb();
    await this.getDb().execute('DELETE FROM reminders');
  }

  /** Close the database connection (useful for testing). */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
