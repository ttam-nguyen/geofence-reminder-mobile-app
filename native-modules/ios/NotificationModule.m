/**
 * iOS Native Notification Module — wraps UNUserNotificationCenter.
 *
 * Provides local notification scheduling, cancellation, and permission management.
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

const { NotificationModule: NativeNotificationModule } = NativeModules;

if (!NativeNotificationModule) {
  console.warn('NotificationModule is not registered. Check your native module setup.');
}

// --- Type definitions (mirrored from TypeScript side) ---

export interface ScheduleNotificationParams {
  notificationId: string;
  title: string;
  body: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  data?: Record<string, string>;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'never_asked';

export interface NotificationOperationResult {
  success: boolean;
  notificationId?: string;
  error?: string;
}

// --- Exported API (used by JS code) ---

/** Schedule a local notification. */
export async function scheduleLocalNotification(
  params: ScheduleNotificationParams,
): Promise<NotificationOperationResult> {
  if (!NativeNotificationModule) {
    return { success: false, error: 'NotificationModule not registered' };
  }

  return NativeNotificationModule.scheduleLocalNotification(params);
}

/** Cancel a scheduled notification by ID. */
export async function cancelNotification(
  notificationId: string,
): Promise<{ success: boolean }> {
  if (!NativeNotificationModule) {
    return { success: false };
  }

  return NativeNotificationModule.cancelNotification(notificationId);
}

/** Check current notification permission state. */
export async function checkNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!NativeNotificationModule) {
    return 'never_asked';
  }

  return NativeNotificationModule.checkNotificationPermission();
}

/** Request notification permission from user. */
export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (!NativeNotificationModule) {
    return 'never_asked';
  }

  return NativeNotificationModule.requestNotificationPermission();
}

export { NativeNotificationModule as NotificationModule };
