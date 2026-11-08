/**
 * Repository implementations backed by SQLite.
 *
 * Wraps the raw SQLiteAdapter with typed CRUD operations matching
 * the repository interfaces defined in src/services/.
 */

import { openDatabase } from './SQLiteAdapter';
import SQLite from 'react-native-sqlite-storage';
import type { ReminderRepository, EventRepository, NotificationLogRepository } from '../services/ReminderRepository';
import type { Reminder } from '../models/Reminder';
import type { ReminderStatus } from '../models/ReminderStatus';
import type { ReminderEvent, EventOutcome, ReminderEventType } from '../models/ReminderEvent';
import type { NotificationDeliveryRecord, DeliveryStatus } from '../models/NotificationDeliveryRecord';

/** Converts a SQLite row to a Reminder object. */
function rowToReminder(row: Record<string, unknown>): Reminder {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description === null || row.description === undefined ? null : String(row.description),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    locationName: row.locationName === null || row.locationName === undefined ? null : String(row.locationName),
    radiusMeters: Number(row.radiusMeters),
    locationSource: String(row.locationSource) as LocationSource,
    status: String(row.status) as ReminderStatus,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    triggeredAt: row.triggeredAt === null || row.triggeredAt === undefined ? null : String(row.triggeredAt),
    completedAt: row.completedAt === null || row.completedAt === undefined ? null : String(row.completedAt),
    notificationSoundEnabled: Boolean(row.notificationSoundEnabled),
    notificationVibrationEnabled: Boolean(row.notificationVibrationEnabled),
  };
}

import { LocationSource } from '../models/LocationSource';

/** Ensures the database is initialized before any repository operation. */
async function ensureDb(): Promise<ReturnType<typeof SQLite.openDatabase>> {
  return openDatabase();
}

/** Converts a SQLite row to a ReminderEvent object. */
function rowToEvent(row: Record<string, unknown>): ReminderEvent {
  const details = row.details ? JSON.parse(String(row.details)) : undefined;
  return {
    id: String(row.id),
    reminderId: String(row.reminderId),
    eventType: String(row.eventType) as ReminderEventType,
    timestamp: String(row.timestamp),
    previousStatus: row.previousStatus === null || row.previousStatus === undefined ? null : String(row.previousStatus) as ReminderStatus | null,
    newStatus: row.newStatus === null || row.newStatus === undefined ? null : String(row.newStatus) as ReminderStatus | null,
    outcome: String(row.outcome) as EventOutcome,
    details,
  };
}

/** Converts a SQLite row to a NotificationDeliveryRecord object. */
function rowToNotificationRecord(row: Record<string, unknown>): NotificationDeliveryRecord {
  return {
    id: String(row.id),
    reminderId: String(row.reminderId),
    notificationId: String(row.notificationId),
    scheduledAt: String(row.scheduledAt),
    deliveredAt: row.deliveredAt === null || row.deliveredAt === undefined ? null : String(row.deliveredAt),
    status: String(row.status) as DeliveryStatus,
    failureReason: row.failureReason === null || row.failureReason === undefined ? null : String(row.failureReason),
  };
}

/** SQLite-backed reminder repository. */
export const sqliteReminderRepository: ReminderRepository = {
  async getById(id: string): Promise<Reminder | null> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql(
      'SELECT * FROM reminders WHERE id = ?',
      [id],
    );

    if (result[0].rows.length === 0) return null;
    return rowToReminder(result[0].rows.item(0));
  },

  async getAll(): Promise<Reminder[]> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql('SELECT * FROM reminders ORDER BY updatedAt DESC');
    const rows = result[0].rows;
    return Array.from({ length: rows.length }, (_, i) => rowToReminder(rows.item(i)));
  },

  async getActive(): Promise<Reminder[]> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql(
      "SELECT * FROM reminders WHERE status IN ('ARMED', 'WAITING_FOR_EXIT') ORDER BY updatedAt DESC",
    );
    const rows = result[0].rows;
    return Array.from({ length: rows.length }, (_, i) => rowToReminder(rows.item(i)));
  },

  async create(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reminder> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const now = new Date().toISOString();
    const generatedId = `reminder_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    await db.executeSql(
      `INSERT INTO reminders (id, title, description, latitude, longitude, locationName, radiusMeters, locationSource, status, createdAt, updatedAt, triggeredAt, completedAt, notificationSoundEnabled, notificationVibrationEnabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedId,
        reminder.title,
        reminder.description,
        reminder.latitude,
        reminder.longitude,
        reminder.locationName,
        reminder.radiusMeters,
        reminder.locationSource,
        reminder.status,
        now,
        now,
        reminder.triggeredAt,
        reminder.completedAt,
        reminder.notificationSoundEnabled ? 1 : 0,
        reminder.notificationVibrationEnabled ? 1 : 0,
      ],
    );

    return {
      ...reminder,
      id: generatedId,
      createdAt: now,
      updatedAt: now,
    };
  },

  async update(id: string, changes: Partial<Reminder>): Promise<Reminder | null> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    // Check if reminder exists
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updateFields: string[] = [];
    const values: unknown[] = [];

    const fieldMap: (keyof Reminder)[] = [
      'title', 'description', 'latitude', 'longitude', 'locationName',
      'radiusMeters', 'status', 'triggeredAt', 'completedAt',
      'notificationSoundEnabled', 'notificationVibrationEnabled',
    ];

    for (const field of fieldMap) {
      if (changes[field] !== undefined) {
        updateFields.push(`${field} = ?`);
        values.push(changes[field]);
      }
    }

    updateFields.push("updatedAt = ?");
    values.push(now);
    values.push(id);

    await db.executeSql(
      `UPDATE reminders SET ${updateFields.join(', ')} WHERE id = ?`,
      values,
    );

    return this.getById(id);
  },

  async delete(id: string): Promise<boolean> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql('DELETE FROM reminders WHERE id = ?', [id]);
    return result[0].rowsAffected > 0;
  },

  async getByStatus(status: ReminderStatus): Promise<Reminder[]> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql(
      'SELECT * FROM reminders WHERE status = ? ORDER BY updatedAt DESC',
      [status],
    );
    const rows = result[0].rows;
    return Array.from({ length: rows.length }, (_, i) => rowToReminder(rows.item(i)));
  },
};

/** SQLite-backed event repository. */
export const sqliteEventRepository: EventRepository = {
  async create(event: Omit<ReminderEvent, 'id'>): Promise<ReminderEvent> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const generatedId = `event_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const details = event.details ? JSON.stringify(event.details) : null;

    await db.executeSql(
      `INSERT INTO reminder_events (id, reminderId, eventType, timestamp, previousStatus, newStatus, outcome, details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedId,
        event.reminderId,
        event.eventType,
        event.timestamp,
        event.previousStatus,
        event.newStatus,
        event.outcome,
        details,
      ],
    );

    return { ...event, id: generatedId };
  },

  async getByReminderId(reminderId: string): Promise<ReminderEvent[]> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql(
      'SELECT * FROM reminder_events WHERE reminderId = ? ORDER BY timestamp DESC',
      [reminderId],
    );
    const rows = result[0].rows;
    return Array.from({ length: rows.length }, (_, i) => rowToEvent(rows.item(i)));
  },

  async deleteByReminderId(reminderId: string): Promise<boolean> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    await db.executeSql('DELETE FROM reminder_events WHERE reminderId = ?', [reminderId]);
    return true; // CASCADE handled by FK, but we explicitly clean up
  },
};

/** SQLite-backed notification delivery log repository. */
export const sqliteNotificationLogRepository: NotificationLogRepository = {
  async create(record: Omit<NotificationDeliveryRecord, 'id'>): Promise<NotificationDeliveryRecord> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const generatedId = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    await db.executeSql(
      `INSERT INTO notification_delivery_records (id, reminderId, notificationId, scheduledAt, deliveredAt, status, failureReason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        generatedId,
        record.reminderId,
        record.notificationId,
        record.scheduledAt,
        record.deliveredAt,
        record.status,
        record.failureReason,
      ],
    );

    return { ...record, id: generatedId };
  },

  async getById(id: string): Promise<NotificationDeliveryRecord | null> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql(
      'SELECT * FROM notification_delivery_records WHERE id = ?',
      [id],
    );

    if (result[0].rows.length === 0) return null;
    return rowToNotificationRecord(result[0].rows.item(0));
  },

  async getByReminderId(reminderId: string): Promise<NotificationDeliveryRecord[]> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql(
      'SELECT * FROM notification_delivery_records WHERE reminderId = ? ORDER BY scheduledAt DESC',
      [reminderId],
    );
    const rows = result[0].rows;
    return Array.from({ length: rows.length }, (_, i) => rowToNotificationRecord(rows.item(i)));
  },

  async getPending(): Promise<NotificationDeliveryRecord[]> {
    const db = await ensureDb();
    if (!db) throw new Error('Database not opened');

    const result = await db.executeSql(
      "SELECT * FROM notification_delivery_records WHERE status = 'SCHEDULED' ORDER BY scheduledAt ASC",
    );
    const rows = result[0].rows;
    return Array.from({ length: rows.length }, (_, i) => rowToNotificationRecord(rows.item(i)));
  },
};
