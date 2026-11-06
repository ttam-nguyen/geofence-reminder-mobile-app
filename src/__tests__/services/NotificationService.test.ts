/**
 * Unit tests for NotificationService.
 *
 * Tests:
 * - scheduleReminderNotification creates delivery records (SCHEDULED)
 * - Failed native scheduling logs FAILED records
 * - checkPermission / requestPermission pass through to native module
 * - playAlertSound / vibrateDevice are no-ops (native handles)
 */

import { describe, it, expect, vi } from 'vitest';
import { NotificationService } from '../../services/NotificationService';
import type { NotificationModuleInterface, ScheduleNotificationParams, NotificationPermissionStatus } from '../../native/NotificationModule';
import type { NotificationLogRepository } from '../../services/ReminderRepository';
import { LocationSource } from '../../models/LocationSource';
import { ReminderStatus } from '../../models/ReminderStatus';

// Create a mock notification module
function createMockNotificationModule(): NotificationModuleInterface {
  return {
    scheduleLocalNotification: vi.fn(async (params: ScheduleNotificationParams) => ({ success: true, notificationId: params.notificationId })),
    cancelNotification: vi.fn(async (_id: string) => ({ success: true })),
    checkNotificationPermission: vi.fn(async () => 'never_asked' as NotificationPermissionStatus),
    requestNotificationPermission: vi.fn(async () => 'granted' as NotificationPermissionStatus),
  };
}

// Create a mock notification log repository
function createMockNotificationLogRepo(): NotificationLogRepository {
  const records: Array<{ id: string; reminderId: string; notificationId: string; scheduledAt: string; deliveredAt: string | null; status: 'SCHEDULED' | 'DELIVERED' | 'FAILED'; failureReason: string | null }> = [];

  return {
    create: vi.fn(async (record) => {
      const created = { ...record, id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}` };
      records.push(created as any);
      return created;
    }),
    getById: vi.fn(async (id: string) => records.find(r => r.id === id) || null),
    getByReminderId: vi.fn(async (reminderId: string) => records.filter(r => r.reminderId === reminderId)),
    getPending: vi.fn(async () => records.filter(r => r.status === 'SCHEDULED')),
  } as unknown as NotificationLogRepository;
}

function createReminder(id: string, title: string, description: string | null = null) {
  return {
    id,
    title,
    description,
    latitude: 37.7749,
    longitude: -124.4194,
    locationName: 'Test Location',
    radiusMeters: 100,
    locationSource: LocationSource.CURRENT_GPS,
    status: ReminderStatus.TRIGGERED,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    triggeredAt: new Date().toISOString(),
    completedAt: null,
    notificationSoundEnabled: true,
    notificationVibrationEnabled: true,
  };
}

describe('NotificationService', () => {
  let mockModule: any;
  let mockRepo: any;
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockModule = createMockNotificationModule();
    mockRepo = createMockNotificationLogRepo();
    service = new NotificationService(mockModule, mockRepo);
  });

  describe('scheduleReminderNotification', () => {
    it('schedules a notification and creates a SCHEDULED delivery record', async () => {
      const reminder = createReminder('r-1', 'Pick up groceries');

      await service.scheduleReminderNotification(reminder);

      expect(mockModule.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationId: expect.stringMatching(/^notif_r-1_/),
          title: 'Pick up groceries',
          body: 'Reminder triggered at Test Location',
          soundEnabled: true,
          vibrationEnabled: true,
        }),
      );

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          reminderId: 'r-1',
          notificationId: expect.stringMatching(/^notif_r-1_/),
          status: 'SCHEDULED',
          failureReason: null,
        }),
      );
    });

    it('uses description as body when provided (falls back to locationName)', async () => {
      const reminder = createReminder('r-2', 'Meeting', 'Call with doctor at 3pm');

      await service.scheduleReminderNotification(reminder);

      expect(mockModule.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Call with doctor at 3pm',
        }),
      );
    });

    it('logs FAILED record when native scheduling fails', async () => {
      mockModule.scheduleLocalNotification = vi.fn(async () => ({ success: false, error: 'Native error' }));
      const reminder = createReminder('r-3', 'Failed reminder');

      await expect(service.scheduleReminderNotification(reminder)).rejects.toThrow('Failed to schedule notification: Native error');

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'FAILED',
          failureReason: 'Native error',
        }),
      );
    });

    it('uses notificationSoundEnabled and notificationVibrationEnabled from reminder', async () => {
      const reminder = createReminder('r-4', 'Silent reminder');
      (reminder as any).notificationSoundEnabled = false;
      (reminder as any).notificationVibrationEnabled = false;

      await service.scheduleReminderNotification(reminder);

      expect(mockModule.scheduleLocalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          soundEnabled: false,
          vibrationEnabled: false,
        }),
      );
    });
  });

  describe('playAlertSound / vibrateDevice', () => {
    it('playAlertSound is a no-op (native handles sound)', async () => {
      await expect(service.playAlertSound()).resolves.toBeUndefined();
    });

    it('vibrateDevice is a no-op (native handles vibration)', async () => {
      await expect(service.vibrateDevice()).resolves.toBeUndefined();
    });
  });

  describe('checkPermission / requestPermission', () => {
    it('checkPermission returns the native module status', async () => {
      const status = await service.checkPermission();

      expect(mockModule.checkNotificationPermission).toHaveBeenCalled();
      expect(status).toBe('never_asked');
    });

    it('requestPermission returns the native module status', async () => {
      const status = await service.requestPermission();

      expect(mockModule.requestNotificationPermission).toHaveBeenCalled();
      expect(status).toBe('granted');
    });

    it('returns correct permission statuses', async () => {
      const testCases: NotificationPermissionStatus[] = ['granted', 'denied', 'never_asked'];

      for (const testStatus of testCases) {
        mockModule.checkNotificationPermission = vi.fn(async () => testStatus);

        const result = await service.checkPermission();
        expect(result).toBe(testStatus);
      }
    });
  });

  describe('getDeliveryRecords / getPendingNotifications', () => {
    it('getDeliveryRecords returns records for a reminder', async () => {
      const reminder = createReminder('r-5', 'Test');

      await service.scheduleReminderNotification(reminder);
      const records = await service.getDeliveryRecords('r-5');

      expect(records).toHaveLength(1);
      expect(records[0].reminderId).toBe('r-5');
    });

    it('getPendingNotifications returns SCHEDULED records', async () => {
      const reminder = createReminder('r-6', 'Pending test');

      await service.scheduleReminderNotification(reminder);
      const pending = await service.getPendingNotifications();

      expect(pending).toHaveLength(1);
      expect(pending[0].status).toBe('SCHEDULED');
    });
  });
});
