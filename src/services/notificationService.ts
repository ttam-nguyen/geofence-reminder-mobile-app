// Notification service — TypeScript interface + notifee v9 implementation.
// Abstracts away notifee internals so that unit tests can mock the service
// without notifee's native dependencies, and a fallback native implementation
// could be swapped in later if notifee proves incompatible.

import notifee, {
  AndroidImportance,
  AuthorizationStatus as NotifeeAuthorizationStatus,
  TriggerType,
} from '@notifee/react-native';

// ---------------------------------------------------------------------------
// Public types (our abstraction)
// ---------------------------------------------------------------------------

/** Notification permission / authorization status. */
export type AuthorizationStatus =
  | 'unspecified'
  | 'denied'
  | 'authorized'
  | 'provisional'
  | 'ephemeral';

/** A notification to be scheduled (fires at a future timestamp) or displayed immediately. */
export interface ScheduledNotification {
  /** Unique identifier for this notification (used for cancel). */
  id: string;
  /** Notification title. */
  title: string;
  /** Optional notification body. */
  body?: string;
  /** Optional payload data (e.g., { reminderId: 'xxx' }). */
  data?: Record<string, string>;
  /** Android-specific configuration. */
  android?: {
    channelId?: string;
    sound?: string | null;
    importance?: number; // 0–4, AndroidImportance
  };
  /** iOS-specific configuration. */
  ios?: {
    sound?: string | null;
  };
  /** When to fire: 'immediate' or a future timestamp. */
  trigger?: 'immediate' | { timestamp: number }; // immediate or future-timestamp trigger
}

/** A notification to be displayed immediately. */
export interface DisplayedNotification extends Omit<ScheduledNotification, 'trigger'> {
  trigger: 'immediate';
}

/** An Android notification channel. */
export interface NotificationChannel {
  /** Unique channel identifier. */
  id: string;
  /** Human-readable channel name (shown in OS settings). */
  name: string;
  /** Optional channel description. */
  description?: string;
  /** Sound filename (without extension) or null for system default. */
  sound?: string | null;
  /** Vibration pattern (alternating on/off in milliseconds) or undefined for default. */
  vibrationPattern?: number[];
  /** Android importance level (0–4); defaults to HIGH. */
  importance?: number; // AndroidImportance
}

// ---------------------------------------------------------------------------
// Service interface
// ---------------------------------------------------------------------------

export interface NotificationService {
  /** Request notification permission. Returns the current authorization status. */
  requestPermission(): Promise<AuthorizationStatus>;

  /** Check current notification permission status (no prompt). */
  checkPermission(): Promise<AuthorizationStatus>;

  /** Schedule a local notification that fires immediately or at a future timestamp. */
  scheduleNotification(notification: ScheduledNotification): Promise<string>;

  /** Display a local notification immediately. */
  displayNotification(notification: DisplayedNotification): Promise<string>;

  /** Cancel a specific notification by its ID. */
  cancelNotification(notificationId: string): Promise<void>;

  /** Cancel all scheduled and displayed notifications. */
  cancelAllNotifications(): Promise<void>;

  /** Get a list of all scheduled (trigger) notification IDs. */
  getScheduledNotificationIds(): Promise<string[]>;

  /** Get all scheduled notifications with their payloads. */
  getScheduledNotifications(): Promise<ScheduledNotification[]>;

  /** Create or update an Android notification channel. Returns the channel ID. */
  createChannel(channel: NotificationChannel): Promise<string>;

  /** Get all notification channels. */
  getChannels(): Promise<NotificationChannel[]>;
}

// ---------------------------------------------------------------------------
// Implementation using @notifee/react-native v9
// ---------------------------------------------------------------------------

const DEFAULT_CHANNEL_ID = 'gps_reminder_default';
const DEFAULT_CHANNEL_NAME = 'GPS Reminders';

/** Map notifee's AuthorizationStatus enum to our string type. */
function mapNotifeeStatus(status: NotifeeAuthorizationStatus): AuthorizationStatus {
  switch (status) {
    case NotifeeAuthorizationStatus.NOT_DETERMINED:
      return 'unspecified';
    case NotifeeAuthorizationStatus.DENIED:
      return 'denied';
    case NotifeeAuthorizationStatus.AUTHORIZED:
      return 'authorized';
    case NotifeeAuthorizationStatus.PROVISIONAL:
      return 'provisional';
    default:
      return 'unspecified';
  }
}

/** Create the default Android notification channel (called once). */
async function ensureDefaultChannel(): Promise<string> {
  const channels = await notifee.getChannels();
  const existing = channels.find((ch: { id: string }) => ch.id === DEFAULT_CHANNEL_ID);
  if (existing) return existing.id;

  return notifee.createChannel({
    id: DEFAULT_CHANNEL_ID,
    name: DEFAULT_CHANNEL_NAME,
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
}

/** Strip null values from an object (notifee v9 does not accept null for sound). */
function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export class NotifeeNotificationService implements NotificationService {
  /** Request notification permission. Returns the current authorization status. */
  async requestPermission(): Promise<AuthorizationStatus> {
    try {
      const settings = await notifee.requestPermission();
      return mapNotifeeStatus(settings.authorizationStatus);
    } catch (err) {
      console.warn('[NotificationService] requestPermission failed:', err);
      return 'denied';
    }
  }

  /** Check current notification permission status (no prompt). */
  async checkPermission(): Promise<AuthorizationStatus> {
    try {
      const settings = await notifee.getNotificationSettings();
      return mapNotifeeStatus(settings.authorizationStatus);
    } catch (err) {
      console.warn('[NotificationService] checkPermission failed:', err);
      return 'denied';
    }
  }

  /** Schedule a local notification that fires immediately or at a future timestamp. */
  async scheduleNotification(notification: ScheduledNotification): Promise<string> {
    try {
      await ensureDefaultChannel();

      const androidConfig = notification.android || {};
      const iosConfig = notification.ios || {};

      let notifeeId: string;

      if (notification.trigger === 'immediate' || !notification.trigger) {
        // Immediate display — use displayNotification (no trigger).
        notifeeId = await notifee.displayNotification({
          id: notification.id,
          title: notification.title,
          body: notification.body || '',
          data: notification.data || {},
          android: stripNulls({
            channelId: androidConfig.channelId || DEFAULT_CHANNEL_ID,
            importance: androidConfig.importance ?? AndroidImportance.HIGH,
            ...(androidConfig.sound && { sound: androidConfig.sound }),
          }),
          ios: stripNulls({
            ...(iosConfig.sound && { sound: iosConfig.sound }),
            threadId: DEFAULT_CHANNEL_ID,
          }),
        });
      } else {
        // Future-timestamp trigger — use createTriggerNotification.
        const timestamp = typeof notification.trigger === 'object' ? notification.trigger.timestamp : 0;
        notifeeId = await notifee.createTriggerNotification(
          {
            id: notification.id,
            title: notification.title,
            body: notification.body || '',
            data: notification.data || {},
            android: stripNulls({
              channelId: androidConfig.channelId || DEFAULT_CHANNEL_ID,
              importance: androidConfig.importance ?? AndroidImportance.HIGH,
              ...(androidConfig.sound && { sound: androidConfig.sound }),
            }),
            ios: stripNulls({
              ...(iosConfig.sound && { sound: iosConfig.sound }),
            }),
          },
          {
            type: TriggerType.TIMESTAMP,
            timestamp,
          },
        );
      }

      return notification.id;
    } catch (err) {
      console.warn('[NotificationService] scheduleNotification failed:', err);
      throw err;
    }
  }

  /** Display a local notification immediately. */
  async displayNotification(notification: DisplayedNotification): Promise<string> {
    try {
      await ensureDefaultChannel();

      const androidConfig = notification.android || {};
      const iosConfig = notification.ios || {};

      const notifeeId = await notifee.displayNotification({
        id: notification.id,
        title: notification.title,
        body: notification.body || '',
        data: notification.data || {},
        android: stripNulls({
          channelId: androidConfig.channelId || DEFAULT_CHANNEL_ID,
          importance: androidConfig.importance ?? AndroidImportance.HIGH,
          ...(androidConfig.sound && { sound: androidConfig.sound }),
        }),
        ios: stripNulls({
          ...(iosConfig.sound && { sound: iosConfig.sound }),
        }),
      });

      return notification.id;
    } catch (err) {
      console.warn('[NotificationService] displayNotification failed:', err);
      throw err;
    }
  }

  /** Cancel a specific notification by its ID (both displayed and scheduled). */
  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await notifee.cancelNotification(notificationId);
    } catch (err) {
      console.warn('[NotificationService] cancelNotification failed:', err);
      // Ignore — the notification may already be gone.
    }
  }

  /** Cancel all scheduled and displayed notifications. */
  async cancelAllNotifications(): Promise<void> {
    try {
      await notifee.cancelAllNotifications();
    } catch (err) {
      console.warn('[NotificationService] cancelAllNotifications failed:', err);
    }
  }

  /** Get a list of all scheduled (trigger) notification IDs. */
  async getScheduledNotificationIds(): Promise<string[]> {
    try {
      return await notifee.getTriggerNotificationIds();
    } catch (err) {
      console.warn('[NotificationService] getScheduledNotificationIds failed:', err);
      return [];
    }
  }

  /** Get all scheduled notifications with their payloads. */
  async getScheduledNotifications(): Promise<ScheduledNotification[]> {
    try {
      const scheduled = await notifee.getTriggerNotifications();
      return scheduled.map((n: { notification: { id?: string; title?: string; body?: string; data?: { [key: string]: string | number | object }; android?: { channelId?: string; sound?: string }; ios?: { sound?: string } }; trigger: { type: number } }) => ({
        id: n.notification.id || '',
        title: n.notification.title || '',
        body: n.notification.body,
        data: n.notification.data
          ? Object.fromEntries(
              Object.entries(n.notification.data).map(([k, v]) => [k, String(v)]),
            )
          : undefined,
        android: {
          channelId: n.notification.android?.channelId,
          sound: n.notification.android?.sound ?? null,
        },
        ios: {
          sound: n.notification.ios?.sound ?? null,
        },
      }));
    } catch (err) {
      console.warn('[NotificationService] getScheduledNotifications failed:', err);
      return [];
    }
  }

  /** Create or update an Android notification channel. Returns the channel ID. */
  async createChannel(channel: NotificationChannel): Promise<string> {
    try {
      await notifee.createChannel({
        id: channel.id,
        name: channel.name,
        description: channel.description,
        importance: channel.importance ?? AndroidImportance.HIGH,
        sound: channel.sound || undefined,
        vibrationPattern: channel.vibrationPattern,
      });
      return channel.id;
    } catch (err) {
      console.warn('[NotificationService] createChannel failed:', err);
      throw err;
    }
  }

  /** Get all notification channels. */
  async getChannels(): Promise<NotificationChannel[]> {
    try {
      const channels = await notifee.getChannels();
      return channels.map((ch: { id: string; name: string; description?: string; importance?: number; sound?: string; vibrationPattern?: number[] }) => ({
        id: ch.id,
        name: ch.name,
        description: ch.description,
        importance: ch.importance,
        sound: ch.sound ?? null,
        vibrationPattern: ch.vibrationPattern,
      }));
    } catch (err) {
      console.warn('[NotificationService] getChannels failed:', err);
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton instance — exported for use by UI screens and stores.
// ---------------------------------------------------------------------------

export const notificationService: NotificationService = new NotifeeNotificationService();
