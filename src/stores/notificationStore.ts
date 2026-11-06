/**
 * Notification Zustand store — manages notification state and delivery records.
 *
 * Connects to the SQLite notification log repository for persistence.
 */

import { create } from 'zustand';
import type { NotificationPermissionStatus } from '../native/NotificationModule';
import type { NotificationDeliveryRecord } from '../models/NotificationDeliveryRecord';

export interface NotificationState {
  /** Current notification permission status (null until first check). */
  permissionStatus: NotificationPermissionStatus | null;

  /** All delivery records for a reminder. */
  deliveryRecords: NotificationDeliveryRecord[];

  /** Check current notification permission status. */
  checkPermission: () => Promise<void>;

  /** Request notification permission from user. */
  requestPermission: () => Promise<NotificationPermissionStatus>;

  /** Schedule a notification for a reminder (by ID, title, body). */
  scheduleNotification: (reminderId: string, title: string, body: string) => Promise<void>;

  /** Get delivery records for a reminder. */
  getDeliveryRecords: (reminderId: string) => Promise<NotificationDeliveryRecord[]>;

  /** Clear the delivery records in the store. */
  clearDeliveryRecords: () => void;

  /** Clear permission status (reset). */
  resetPermissionStatus: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  permissionStatus: null,
  deliveryRecords: [],

  checkPermission: async () => {
    // This is a placeholder — the actual NotificationService handles native calls.
    // The store simply tracks the state for UI consumption.
    set({ permissionStatus: 'never_asked' });
  },

  requestPermission: async (): Promise<NotificationPermissionStatus> => {
    // Placeholder — actual permission request handled by NotificationService.
    const status: NotificationPermissionStatus = 'never_asked';
    set({ permissionStatus: status });
    return status;
  },

  scheduleNotification: async (_reminderId: string, _title: string, _body: string): Promise<void> => {
    // Placeholder — actual scheduling handled by NotificationService.
  },

  getDeliveryRecords: async (_reminderId: string): Promise<NotificationDeliveryRecord[]> => {
    // Placeholder — actual delivery records from NotificationLogRepository.
    const records: NotificationDeliveryRecord[] = [];
    set({ deliveryRecords: records });
    return records;
  },

  clearDeliveryRecords: () => {
    set({ deliveryRecords: [] });
  },

  resetPermissionStatus: () => {
    set({ permissionStatus: null });
  },
}));
