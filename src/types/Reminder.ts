// Reminder status enum matching the state machine spec.
// CANCELLED is the canonical name from the spec; DELETED is an alias for backward compatibility.

export enum ReminderStatus {
  DRAFT = 'DRAFT',
  WAITING_FOR_EXIT = 'WAITING_FOR_EXIT',
  ARMED = 'ARMED',
  ARRIVAL_PENDING = 'ARRIVAL_PENDING',
  TRIGGERED = 'TRIGGERED',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  DELETED = 'DELETED', // alias for CANCELLED (backward compat)
}

export type LocationSource = 'current' | 'pin' | 'search';

export interface Reminder {
  id: string;
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  locationName: string | null;
  radiusMeters: number; // fixed at 200 in production
  locationSource: LocationSource;
  status: ReminderStatus;
  createdAt: string;
  updatedAt: string;
  triggeredAt: string | null;
  completedAt: string | null;
  notificationSoundEnabled: boolean;
  notificationVibrationEnabled: boolean;
}
