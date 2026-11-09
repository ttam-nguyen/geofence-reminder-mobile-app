/**
 * Zustand store for reminder CRUD operations.
 *
 * Connects to the SQLite repository and integrates the state machine
 * for valid status transitions.
 */

import { create } from 'zustand';
import type { Reminder } from '../models/Reminder';
import { ReminderStatus } from '../models/ReminderStatus';
import { sqliteReminderRepository } from '../data/ReminderRepositoryImpl';
import { canTransition } from '../services/StateMachine';

/** Validation error for store operations. */
export interface StoreError {
  type: 'validation' | 'not_found' | 'invalid_transition' | 'database';
  message: string;
  field?: string;
}

export interface ReminderState {
  /** All reminders in the store. */
  reminders: Reminder[];

  /** Loading state for async operations. */
  loading: boolean;

  /** Last error message (null when no error). */
  error: string | null;

  /** Loads all reminders from the repository. */
  loadAll: () => Promise<void>;

  /** Creates a new reminder with automatic initial status. */
  createReminder: (data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reminder>;

  /** Updates an existing reminder by ID. */
  updateReminder: (id: string, changes: Partial<Reminder>) => Promise<Reminder | null>;

  /** Deletes a reminder by ID. */
  deleteReminder: (id: string) => Promise<boolean>;

  /** Transitions a reminder to a new status (validates transition). */
  transitionStatus: (id: string, newStatus: ReminderStatus) => Promise<Reminder | null>;

  /** Gets active reminders (ARMED, WAITING_FOR_EXIT). */
  getActive: () => Promise<Reminder[]>;

  /** Gets reminders by status. */
  getByStatus: (status: ReminderStatus) => Promise<Reminder[]>;

  /** Gets a single reminder by ID (read-only selector). */
  getById: (id: string) => Reminder | undefined;

  /** Clears the error state. */
  clearError: () => void;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: [],
  loading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadAll: async () => {
    set({ loading: true, error: null });
    try {
      const reminders = await sqliteReminderRepository.getAll();
      set({ reminders, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reminders';
      set({ error: message, loading: false });
    }
  },

  createReminder: async (data): Promise<Reminder> => {
    set({ loading: true, error: null });
    try {
      // Validate the reminder data
      const validationErrors = [];
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        validationErrors.push({ field: 'title', message: 'Title is required and must be non-empty' });
      } else if (data.title.length > 100) {
        validationErrors.push({ field: 'title', message: 'Title must be 100 characters or fewer' });
      }

      if (data.latitude === undefined || data.latitude === null || typeof data.latitude !== 'number' || isNaN(data.latitude)) {
        validationErrors.push({ field: 'latitude', message: 'Latitude is required' });
      } else if (data.latitude < -90 || data.latitude > 90) {
        validationErrors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
      }

      if (data.longitude === undefined || data.longitude === null || typeof data.longitude !== 'number' || isNaN(data.longitude)) {
        validationErrors.push({ field: 'longitude', message: 'Longitude is required' });
      } else if (data.longitude < -180 || data.longitude > 180) {
        validationErrors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
      }

      if (data.radiusMeters === undefined || data.radiusMeters === null || typeof data.radiusMeters !== 'number' || isNaN(data.radiusMeters)) {
        validationErrors.push({ field: 'radiusMeters', message: 'Radius is required' });
      } else if (data.radiusMeters < 10 || data.radiusMeters > 500) {
        validationErrors.push({ field: 'radiusMeters', message: 'Radius must be between 10 and 500 meters' });
      }

      if (validationErrors.length > 0) {
        set({
          error: validationErrors.map((e) => e.message).join('; '),
          loading: false,
        });
        throw new Error(validationErrors.map((e) => e.message).join('; '));
      }

      // Determine initial status based on user's position relative to geofence
      // For MVP: default to ARMED (user is outside) unless explicitly set
      let status = data.status;
      if (!status || status === ReminderStatus.DRAFT) {
        status = ReminderStatus.ARMED;
      }

      const reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        status,
        triggeredAt: null,
        completedAt: null,
      };

      const created = await sqliteReminderRepository.create(reminder);
      set((state) => ({
        reminders: [created, ...state.reminders],
        loading: false,
      }));

      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create reminder';
      set({ error: message, loading: false });
      throw err;
    }
  },

  updateReminder: async (id, changes): Promise<Reminder | null> => {
    set({ loading: true, error: null });
    try {
      const updated = await sqliteReminderRepository.update(id, changes);

      if (updated) {
        set((state) => ({
          reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
          loading: false,
        }));
      } else {
        set({ error: 'Reminder not found', loading: false });
      }

      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update reminder';
      set({ error: message, loading: false });
      return null;
    }
  },

  deleteReminder: async (id): Promise<boolean> => {
    set({ loading: true, error: null });
    try {
      const deleted = await sqliteReminderRepository.delete(id);

      if (deleted) {
        set((state) => ({
          reminders: state.reminders.filter((r) => r.id !== id),
          loading: false,
        }));
      } else {
        set({ error: 'Reminder not found', loading: false });
      }

      return deleted;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete reminder';
      set({ error: message, loading: false });
      return false;
    }
  },

  transitionStatus: async (id, newStatus): Promise<Reminder | null> => {
    set({ loading: true, error: null });
    try {
      const current = get().reminders.find((r) => r.id === id);

      if (!current) {
        set({ error: 'Reminder not found', loading: false });
        return null;
      }

      // Validate transition
      if (!canTransition(current.status, newStatus)) {
        set({
          error: `Cannot transition from ${current.status} to ${newStatus}`,
          loading: false,
        });
        return null;
      }

      // Update the reminder with new status
      const updated = await sqliteReminderRepository.update(id, { status: newStatus });

      if (updated) {
        set((state) => ({
          reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
          loading: false,
        }));
      } else {
        set({ error: 'Failed to update reminder status', loading: false });
      }

      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to transition status';
      set({ error: message, loading: false });
      return null;
    }
  },

  getActive: async () => {
    set({ loading: true, error: null });
    try {
      const reminders = await sqliteReminderRepository.getActive();
      set({ reminders: reminders, loading: false });
      return reminders;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get active reminders';
      set({ error: message, loading: false });
      return [];
    }
  },

  getByStatus: async (status) => {
    set({ loading: true, error: null });
    try {
      const reminders = await sqliteReminderRepository.getByStatus(status);
      set({ loading: false });
      return reminders;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get reminders by status';
      set({ error: message, loading: false });
      return [];
    }
  },

  getById: (id) => {
    return get().reminders.find((r) => r.id === id);
  },
}));
