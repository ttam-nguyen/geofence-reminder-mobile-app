/**
 * Model re-exports (types and functions only).
 *
 * Enums are exported directly from their source files to avoid
 * verbatimModuleSyntax conflicts (enums are both values and types).
 */

export type { Reminder, createReminder, updateReminder, validateReminder, ValidationError } from './Reminder';

export type { ReminderEvent, createReminderEvent, ReminderEventType, EventOutcome } from './ReminderEvent';

export type { NotificationDeliveryRecord, createNotificationDeliveryRecord, DeliveryStatus } from './NotificationDeliveryRecord';
export { determineInitialStatus } from '../services/StateMachine';
