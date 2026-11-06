/**
 * TypeScript interfaces for the native notification module.
 *
 * Defines the contract between JS and native code (iOS UNUserNotificationCenter + Android NotificationManager).
 */

/** Parameters for scheduling a local notification. */
export interface ScheduleNotificationParams {
  /** Maps to Reminder.id or NotificationDeliveryRecord.id */
  notificationId: string;
  /** Notification title (reminder title) */
  title: string;
  /** Notification body (reminder context) */
  body: string;
  /** Whether to play alert sound */
  soundEnabled: boolean;
  /** Whether to vibrate device */
  vibrationEnabled: boolean;
  /** Custom data (reminder ID, deep link) */
  data?: Record<string, string>;
}

/** Permission status returned by checkNotificationPermission(). */
export type NotificationPermissionStatus = 'granted' | 'denied' | 'never_asked';

/** Result of a schedule/cancel operation. */
export interface NotificationOperationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

/** Native module interface for notifications. */
export interface NotificationModuleInterface {
  /** Schedule a local notification. Returns success/error with notificationId. */
  scheduleLocalNotification(params: ScheduleNotificationParams): Promise<NotificationOperationResult>;

  /** Cancel a scheduled notification by ID. */
  cancelNotification(notificationId: string): Promise<{ success: boolean }>;

  /** Check current notification permission state. */
  checkNotificationPermission(): Promise<NotificationPermissionStatus>;

  /** Request notification permission from user. */
  requestNotificationPermission(): Promise<NotificationPermissionStatus>;
}

// --- Native module reference (populated by native bridge at runtime) ---

declare const NotificationModule: NotificationModuleInterface;

export { NotificationModule };
