/**
 * NotificationDeliveryRecord — logs notification delivery attempts.
 *
 * Tracks whether notifications were delivered, scheduled, or failed.
 */

export type DeliveryStatus = 'SCHEDULED' | 'DELIVERED' | 'FAILED';

export interface NotificationDeliveryRecord {
  /** UUID v4 identifier */
  id: string;

  /** Parent reminder ID */
  reminderId: string;

  /** OS-assigned notification ID */
  notificationId: string;

  /** When the notification was scheduled (ISO 8601) */
  scheduledAt: string;

  /** When the notification was actually delivered (ISO 8601, null if not yet) */
  deliveredAt: string | null;

  /** Delivery status */
  status: DeliveryStatus;

  /** Reason for failure (null if delivered or scheduled) */
  failureReason: string | null;
}

/** Creates a NotificationDeliveryRecord with defaults. */
export function createNotificationDeliveryRecord(overrides: Partial<NotificationDeliveryRecord> = {}): NotificationDeliveryRecord {
  return {
    id: overrides.id || '',
    reminderId: overrides.reminderId || '',
    notificationId: overrides.notificationId || '',
    scheduledAt: overrides.scheduledAt || new Date().toISOString(),
    deliveredAt: overrides.deliveredAt ?? null,
    status: overrides.status || 'SCHEDULED',
    failureReason: overrides.failureReason ?? null,
  };
}
