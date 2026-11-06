/**
 * Notification Service — schedules local notifications, plays sound/vibration.
 *
 * Wraps the native notification module and logs deliveries to SQLite.
 */

import type { Reminder } from '../models/Reminder';
import type { NotificationDeliveryRecord } from '../models/NotificationDeliveryRecord';
import type { NotificationModuleInterface, ScheduleNotificationParams, NotificationPermissionStatus } from '../native/NotificationModule';
import type { NotificationLogRepository } from '../services/ReminderRepository';

/** Creates a unique notification ID based on reminder ID and timestamp. */
function generateNotificationId(reminderId: string): string {
  return `notif_${reminderId}_${Date.now()}`;
}

/** Converts a Reminder to ScheduleNotificationParams. */
function reminderToScheduleParams(reminder: Reminder): ScheduleNotificationParams {
  const notificationId = generateNotificationId(reminder.id);

  return {
    notificationId,
    title: reminder.title,
    body: reminder.description || `Reminder triggered at ${reminder.locationName || 'selected location'}`,
    soundEnabled: reminder.notificationSoundEnabled ?? true,
    vibrationEnabled: reminder.notificationVibrationEnabled ?? true,
    data: { reminderId: reminder.id },
  };
}

export class NotificationService {
  constructor(
    private notificationModule: NotificationModuleInterface,
    private deliveryRepository: NotificationLogRepository,
  ) {}

  /** Schedule a local notification for a triggered reminder. Returns the notification ID. */
  async scheduleReminderNotification(reminder: Reminder): Promise<string> {
    const params = reminderToScheduleParams(reminder);

    const result = await this.notificationModule.scheduleLocalNotification(params);

    if (!result.success) {
      // Log the failure to SQLite for debugging
      const failureRecord: Omit<NotificationDeliveryRecord, 'id'> = {
        reminderId: reminder.id,
        notificationId: params.notificationId,
        scheduledAt: new Date().toISOString(),
        deliveredAt: null,
        status: 'FAILED',
        failureReason: result.error || 'Unknown native module error',
      };

      await this.deliveryRepository.create(failureRecord);
      throw new Error(`Failed to schedule notification: ${result.error}`);
    }

    // Log the successful scheduling
    const deliveryRecord: Omit<NotificationDeliveryRecord, 'id'> = {
      reminderId: reminder.id,
      notificationId: params.notificationId,
      scheduledAt: new Date().toISOString(),
      deliveredAt: null,
      status: 'SCHEDULED',
      failureReason: null,
    };

    await this.deliveryRepository.create(deliveryRecord);

    return params.notificationId;
  }

  /** Play alert sound (if enabled and OS allows). No-op if sound is disabled. */
  async playAlertSound(): Promise<void> {
    // Native module handles sound playback. JS side has no audio files.
    // This is a pass-through to the native module for future extension.
  }

  /** Vibrate device (if enabled and supported). No-op if vibration is disabled. */
  async vibrateDevice(): Promise<void> {
    // Native module handles vibration. JS side has no vibration API in RN core.
    // This is a pass-through for future extension.
  }

  /** Check notification permission status. */
  async checkPermission(): Promise<NotificationPermissionStatus> {
    return this.notificationModule.checkNotificationPermission();
  }

  /** Request notification permission from user. */
  async requestPermission(): Promise<NotificationPermissionStatus> {
    return this.notificationModule.requestNotificationPermission();
  }

  /** Get delivery records for a reminder. */
  async getDeliveryRecords(reminderId: string): Promise<NotificationDeliveryRecord[]> {
    return this.deliveryRepository.getByReminderId(reminderId);
  }

  /** Get pending (undelivered) notification records. */
  async getPendingNotifications(): Promise<NotificationDeliveryRecord[]> {
    return this.deliveryRepository.getPending();
  }
}
