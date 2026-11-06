/**
 * Registration Manager — maps reminders ↔ native geofences.
 *
 * Handles capacity policy (iOS 20, Android 500), registration lifecycle,
 * and re-registration on status changes.
 */

import type { Reminder } from '../models/Reminder';
import { ReminderStatus } from '../models/ReminderStatus';
import type { RegisterGeofenceParams } from '../native/GeofencingModule';

/** iOS region limit, Android geofence limit. */
export const IOS_LIMIT = 20;
export const ANDROID_LIMIT = 500;

/** Priority per status (higher = keep when over limit). */
export const PRIORITY: Record<ReminderStatus, number> = {
  [ReminderStatus.ARMED]: 3,
  [ReminderStatus.WAITING_FOR_EXIT]: 2,
  [ReminderStatus.DRAFT]: 1,
  [ReminderStatus.TRIGGERED]: 0,
  [ReminderStatus.COMPLETED]: 0,
  [ReminderStatus.CANCELLED]: 0,
};

/** Internal tracking of registered geofences. */
export interface GeofenceRegistration {
  reminderId: string;
  registeredAt: number; // epoch ms
  status: ReminderStatus;
}

/** Type alias for the native geofencing module interface. */
export type GeofencingModuleType = {
  registerGeofence: (params: RegisterGeofenceParams) => Promise<{ success: boolean; error?: string }>;
  unregisterGeofence: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  unregisterAllGeofences: () => Promise<{ success: boolean }>;
  checkPermissions: () => Promise<any>;
  requestLocationPermission: () => Promise<string>;
  requestBackgroundPermission: () => Promise<boolean>;
  isGooglePlayServicesAvailable: () => Promise<boolean>;
};

/** ReminderRepository with optional geofence methods. */
export interface GeofenceAwareRepository {
  getAll(): Promise<Reminder[]>;
  getById(id: string): Promise<Reminder | null>;
  update(id: string, changes: Partial<Reminder>): Promise<Reminder | null>;
}

export class RegistrationManager {
  private registrations: Map<string, GeofenceRegistration> = new Map();

  constructor(
    private repository: GeofenceAwareRepository,
    private geofencingModule: GeofencingModuleType,
    platformLimit: number = IOS_LIMIT,
  ) {
    this.platformLimit = platformLimit;
  }

  private platformLimit: number;

  /** Register all eligible reminders as native geofences (restart recovery). */
  async registerAll(): Promise<void> {
    // Clear existing registrations (fresh start after restart)
    this.registrations.clear();

    const reminders = await this.repository.getAll();
    const eligible = reminders.filter(
      (r) =>
        r.status === ReminderStatus.ARMED ||
        r.status === ReminderStatus.WAITING_FOR_EXIT,
    );

    // Enforce capacity before registering
    const toRegister = this.enforceCapacityLocal(eligible);

    for (const reminder of toRegister) {
      await this.registerReminder(reminder);
    }
  }

  /** Register a single reminder as a native geofence. */
  async registerReminder(reminder: Reminder): Promise<void> {
    // Don't register terminal states
    if (
      reminder.status === ReminderStatus.TRIGGERED ||
      reminder.status === ReminderStatus.COMPLETED ||
      reminder.status === ReminderStatus.CANCELLED
    ) {
      return;
    }

    // Don't register DRAFT reminders (no location yet)
    if (reminder.status === ReminderStatus.DRAFT) {
      return;
    }

    const params: RegisterGeofenceParams = {
      requestId: reminder.id,
      latitude: reminder.latitude,
      longitude: reminder.longitude,
      radiusMeters: Math.min(Math.max(reminder.radiusMeters, 10), 500),
      notifyOnEntry: true,
    };

    const result = await this.geofencingModule.registerGeofence(params);

    if (!result.success) {
      throw new Error(
        `Failed to register geofence for ${reminder.id}: ${result.error}`,
      );
    }

    this.registrations.set(reminder.id, {
      reminderId: reminder.id,
      registeredAt: Date.now(),
      status: reminder.status,
    });

    // Enforce capacity after registration
    await this.enforceCapacity();
  }

  /** Unregister a single reminder's native geofence. */
  async unregisterReminder(reminderId: string): Promise<void> {
    const registration = this.registrations.get(reminderId);
    if (!registration) {
      return; // Already unregistered
    }

    await this.geofencingModule.unregisterGeofence(reminderId);
    this.registrations.delete(reminderId);
  }

  /** Unregister all geofences (app shutdown). */
  async unregisterAll(): Promise<void> {
    await this.geofencingModule.unregisterAllGeofences();
    this.registrations.clear();
  }

  /** Enforce capacity: if over limit, drop lowest-priority reminders. */
  async enforceCapacity(): Promise<string[]> {
    const currentIds = Array.from(this.registrations.keys());
    if (currentIds.length <= this.platformLimit) {
      return []; // Under limit, nothing to drop
    }

    // Get reminders for the current registrations by fetching all and filtering
    const allReminders = await this.repository.getAll();
    const relevant = allReminders.filter((r) => currentIds.includes(r.id));

    // Sort by priority (lowest first), then by registration time (oldest first)
    const sorted = [...relevant].sort((a, b) => {
      const priorityDiff = PRIORITY[a.status] - PRIORITY[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      const aReg = this.registrations.get(a.id);
      const bReg = this.registrations.get(b.id);
      return (aReg?.registeredAt ?? 0) - (bReg?.registeredAt ?? 0);
    });

    const toDrop = sorted.slice(0, currentIds.length - this.platformLimit);
    const droppedIds: string[] = [];

    for (const reminder of toDrop) {
      await this.unregisterReminder(reminder.id);
      droppedIds.push(reminder.id);
    }

    return droppedIds;
  }

  /** Local capacity enforcement (used during registerAll). */
  private enforceCapacityLocal(reminders: Reminder[]): Reminder[] {
    if (reminders.length <= this.platformLimit) {
      return reminders;
    }

    const sorted = [...reminders].sort((a, b) => {
      const priorityDiff = PRIORITY[a.status] - PRIORITY[b.status];
      if (priorityDiff !== 0) return priorityDiff;
      return a.updatedAt.localeCompare(b.updatedAt); // newest first
    });

    return sorted.slice(0, this.platformLimit);
  }

  /** Get current count of registered geofences. */
  getRegistrationCount(): number {
    return this.registrations.size;
  }

  /** Get all registered reminder IDs. */
  getRegisteredReminderIds(): string[] {
    return Array.from(this.registrations.keys());
  }

  /** Get a specific registration (for internal use). */
  getRegistration(reminderId: string): GeofenceRegistration | undefined {
    return this.registrations.get(reminderId);
  }

  /** Check if a reminder is currently registered. */
  isRegistered(reminderId: string): boolean {
    return this.registrations.has(reminderId);
  }

  /** Clear all registrations (internal reset). */
  clear(): void {
    this.registrations.clear();
  }

  /** Add a registration directly (for testing capacity policy). */
  addRegistration(reminderId: string, status: ReminderStatus): void {
    this.registrations.set(reminderId, {
      reminderId,
      registeredAt: Date.now(),
      status,
    });
  }

  /** Get the internal registrations map (for testing). */
  getRegistrations(): Map<string, GeofenceRegistration> {
    return this.registrations;
  }
}
