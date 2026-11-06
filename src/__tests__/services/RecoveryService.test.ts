/**
 * Unit tests for RecoveryService.
 *
 * Tests:
 * - recoverOnAppStart re-registers ARMED and WAITING_FOR_EXIT reminders
 * - Skips TRIGGERED, COMPLETED, CANCELLED reminders
 * - recoverOnDeviceBoot behaves identically to recoverOnAppStart
 * - getEligibleReminderCount returns correct count
 */

import { describe, it, expect, vi } from 'vitest';
import { RecoveryService } from '../../services/RecoveryService';
import type { ReminderRepository, NotificationLogRepository } from '../../services/ReminderRepository';
import type { RegistrationManager } from '../../services/RegistrationManager';
import { ReminderStatus } from '../../models/ReminderStatus';

// Create a mock repository
function createMockRepo(): ReminderRepository {
  const reminders: Array<any> = [];

  return {
    getById: vi.fn((id: string) => reminders.find(r => r.id === id) || null),
    getAll: vi.fn(() => [...reminders]),
    getActive: vi.fn(() => reminders.filter(r => r.status === ReminderStatus.ARMED || r.status === ReminderStatus.WAITING_FOR_EXIT)),
    create: vi.fn((data: any) => {
      const reminder = { ...data, id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      reminders.push(reminder);
      return reminder;
    }),
    update: vi.fn((id: string, changes: any) => {
      const reminder = reminders.find(r => r.id === id);
      if (!reminder) return null;
      const updated = { ...reminder, ...changes, updatedAt: new Date().toISOString() };
      const idx = reminders.findIndex(r => r.id === id);
      reminders[idx] = updated;
      return updated;
    }),
    delete: vi.fn((id: string) => {
      const idx = reminders.findIndex(r => r.id === id);
      if (idx < 0) return false;
      reminders.splice(idx, 1);
      return true;
    }),
    getByStatus: vi.fn((status: ReminderStatus) => reminders.filter(r => r.status === status)),
  } as unknown as ReminderRepository;
}

// Create a mock notification log repository (no-op for this test)
function createMockNotificationLogRepo(): NotificationLogRepository {
  return {
    create: vi.fn(async (record: any) => record),
    getById: vi.fn(async (_id: string) => null),
    getByReminderId: vi.fn(async (_reminderId: string) => []),
    getPending: vi.fn(async () => []),
  } as unknown as NotificationLogRepository;
}

// Create a mock registration manager
function createMockRegistrationManager(): RegistrationManager {
  const registered: string[] = [];

  return {
    registerReminder: vi.fn(async (reminder: any) => {
      registered.push(reminder.id);
    }),
    unregisterReminder: vi.fn(async (_id: string) => {}),
    unregisterAll: vi.fn(async () => { registered.length = 0; }),
    registerAll: vi.fn(async () => {}),
    enforceCapacity: vi.fn(async () => []),
    getRegistrationCount: vi.fn(() => registered.length),
    getRegisteredReminderIds: vi.fn(() => [...registered]),
    getRegistration: vi.fn((_id: string) => undefined),
    isRegistered: vi.fn((_id: string) => false),
    clear: vi.fn(() => { registered.length = 0; }),
    addRegistration: vi.fn((_id: string, _status: ReminderStatus) => {}),
    getRegistrations: vi.fn(() => new Map()),
  } as unknown as RegistrationManager;
}

function createReminder(id: string, status: ReminderStatus): any {
  return {
    id,
    title: `Reminder ${id}`,
    description: null,
    latitude: 37.7749,
    longitude: -122.4194,
    locationName: null,
    radiusMeters: 100,
    locationSource: 'current_gps',
    status,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    triggeredAt: null,
    completedAt: null,
    notificationSoundEnabled: true,
    notificationVibrationEnabled: true,
  };
}

describe('RecoveryService', () => {
  let mockRepo: any;
  let mockRegistrationManager: any;
  let mockNotificationLogRepo: any;
  let service: RecoveryService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepo();
    mockRegistrationManager = createMockRegistrationManager();
    mockNotificationLogRepo = createMockNotificationLogRepo();
    service = new RecoveryService(mockRepo, mockRegistrationManager, mockNotificationLogRepo);
  });

  describe('recoverOnAppStart', () => {
    it('re-registers all ARMED reminders', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-1', ReminderStatus.ARMED),
        createReminder('r-2', ReminderStatus.TRIGGERED),
      ]);

      await service.recoverOnAppStart();

      expect(mockRegistrationManager.registerReminder).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r-1', status: ReminderStatus.ARMED }),
      );
      expect(mockRegistrationManager.registerReminder).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r-2' }),
      );
    });

    it('re-registers all WAITING_FOR_EXIT reminders', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-3', ReminderStatus.WAITING_FOR_EXIT),
      ]);

      await service.recoverOnAppStart();

      expect(mockRegistrationManager.registerReminder).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r-3', status: ReminderStatus.WAITING_FOR_EXIT }),
      );
    });

    it('skips TRIGGERED, COMPLETED, and CANCELLED reminders', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-4', ReminderStatus.TRIGGERED),
        createReminder('r-5', ReminderStatus.COMPLETED),
        createReminder('r-6', ReminderStatus.CANCELLED),
      ]);

      await service.recoverOnAppStart();

      expect(mockRegistrationManager.registerReminder).not.toHaveBeenCalled();
    });

    it('skips DRAFT reminders', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-7', ReminderStatus.DRAFT),
      ]);

      await service.recoverOnAppStart();

      expect(mockRegistrationManager.registerReminder).not.toHaveBeenCalled();
    });

    it('handles mixed statuses correctly', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-1', ReminderStatus.ARMED),
        createReminder('r-2', ReminderStatus.DRAFT),
        createReminder('r-3', ReminderStatus.WAITING_FOR_EXIT),
        createReminder('r-4', ReminderStatus.TRIGGERED),
      ]);

      await service.recoverOnAppStart();

      expect(mockRegistrationManager.registerReminder).toHaveBeenCalledTimes(2);
      const calls = (mockRegistrationManager.registerReminder as any).mock.calls;
      expect(calls[0][0].id).toBe('r-1');
      expect(calls[1][0].id).toBe('r-3');
    });

    it('does not crash when registration fails (catches errors)', async () => {
      mockRegistrationManager.registerReminder = vi.fn(async () => {
        throw new Error('Native registration failed');
      });
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-8', ReminderStatus.ARMED),
      ]);

      // Should not throw — errors are caught internally
      await expect(service.recoverOnAppStart()).resolves.toBeUndefined();
    });
  });

  describe('recoverOnDeviceBoot', () => {
    it('behaves identically to recoverOnAppStart', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-9', ReminderStatus.ARMED),
      ]);

      await service.recoverOnDeviceBoot();

      expect(mockRegistrationManager.registerReminder).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r-9', status: ReminderStatus.ARMED }),
      );
    });
  });

  describe('restorePendingNotifications', () => {
    it('is a no-op for MVP (no complex restoration needed)', async () => {
      await expect(service.restorePendingNotifications()).resolves.toBeUndefined();
    });
  });

  describe('getEligibleReminderCount', () => {
    it('returns the count of eligible reminders', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-10', ReminderStatus.ARMED),
        createReminder('r-11', ReminderStatus.WAITING_FOR_EXIT),
        createReminder('r-12', ReminderStatus.TRIGGERED),
      ]);

      const count = await service.getEligibleReminderCount();

      expect(count).toBe(2);
    });

    it('returns 0 when no eligible reminders exist', async () => {
      (mockRepo.getAll as any).mockResolvedValue([
        createReminder('r-13', ReminderStatus.TRIGGERED),
      ]);

      const count = await service.getEligibleReminderCount();

      expect(count).toBe(0);
    });
  });
});
