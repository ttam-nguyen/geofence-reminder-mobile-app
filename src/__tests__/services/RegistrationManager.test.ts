/**
 * Unit tests for RegistrationManager.
 *
 * Tests capacity policy, register/unregister logic, and restart recovery.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RegistrationManager, IOS_LIMIT, ANDROID_LIMIT, PRIORITY } from '../../services/RegistrationManager';
import type { GeofencingModuleType } from '../../services/RegistrationManager';
import { ReminderStatus } from '../../models/ReminderStatus';
import type { ReminderRepository } from '../../services/ReminderRepository';

// Create a mock repository
function createMockRepo(): ReminderRepository {
  const reminders: Map<string, any> = new Map();

  return {
    getById: vi.fn((id: string) => reminders.get(id) || null),
    getAll: vi.fn(() => Array.from(reminders.values())),
    getActive: vi.fn(() => Array.from(reminders.values()).filter((r) => r.status === ReminderStatus.ARMED || r.status === ReminderStatus.WAITING_FOR_EXIT)),
    create: vi.fn((data: any) => {
      const reminder = { ...data, id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      reminders.set(reminder.id, reminder);
      return reminder;
    }),
    update: vi.fn((id: string, changes: any) => {
      const reminder = reminders.get(id);
      if (!reminder) return null;
      const updated = { ...reminder, ...changes, updatedAt: new Date().toISOString() };
      reminders.set(id, updated);
      return updated;
    }),
    delete: vi.fn((id: string) => {
      if (!reminders.has(id)) return false;
      reminders.delete(id);
      return true;
    }),
    getByStatus: vi.fn((status: ReminderStatus) => Array.from(reminders.values()).filter((r) => r.status === status)),
  } as unknown as ReminderRepository;
}

// Create a mock geofencing module
function createMockGeofencing(): GeofencingModuleType {
  const registered: string[] = [];
  return {
    registerGeofence: vi.fn(async (_params: any) => ({ success: true })),
    unregisterGeofence: vi.fn(async (id: string) => { const idx = registered.indexOf(id); if (idx >= 0) registered.splice(idx, 1); return { success: true }; }),
    unregisterAllGeofences: vi.fn(async () => ({ success: true })),
    checkPermissions: vi.fn(async () => ({ locationPermission: 'granted' as const, notificationPermission: 'denied' as const, backgroundLocationAllowed: false })),
    requestLocationPermission: vi.fn(async () => 'granted'),
    requestBackgroundPermission: vi.fn(async () => true),
    isGooglePlayServicesAvailable: vi.fn(async () => true),
  };
}

function createReminder(id: string, status: ReminderStatus, updatedAt = '2024-01-01T00:00:00.000Z'): any {
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
    updatedAt,
    triggeredAt: null,
    completedAt: null,
    notificationSoundEnabled: true,
    notificationVibrationEnabled: true,
  };
}

describe('RegistrationManager', () => {
  let mockRepo: ReminderRepository;
  let mockGeofencing: any;
  let manager: RegistrationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepo();
    mockGeofencing = createMockGeofencing();
    manager = new RegistrationManager(mockRepo, mockGeofencing, IOS_LIMIT);
  });

  describe('Capacity Policy', () => {
    it('does not drop when under limit', async () => {
      const reminders = Array.from({ length: 15 }, (_, i) => createReminder(`r-${i}`, ReminderStatus.ARMED));
      (mockRepo.getAll as any).mockResolvedValue(reminders);

      const dropped = await manager.enforceCapacity();
      expect(dropped).toEqual([]);
    });

    it('drops lowest priority when over iOS limit', async () => {
      // Populate registrations and mock repo
      for (let i = 0; i < 25; i++) {
        const status = i < 10 ? ReminderStatus.ARMED : ReminderStatus.WAITING_FOR_EXIT;
        manager.addRegistration(`r-${i}`, status);
        // Also add to mock repo so enforceCapacity can find them
        (mockRepo.getAll as any).mockImplementation(() => {
          const reminders: any[] = [];
          for (let j = 0; j < 25; j++) {
            const s = j < 10 ? ReminderStatus.ARMED : ReminderStatus.WAITING_FOR_EXIT;
            reminders.push(createReminder(`r-${j}`, s));
          }
          return reminders;
        });
      }

      // 25 - 20 = 5 should be dropped (WAITING_FOR_EXIT has priority 2, ARMED has 3)
      const dropped = await manager.enforceCapacity();

      expect(manager.getRegistrationCount()).toBe(20); // 5 dropped
      expect(dropped.length).toBe(5);
      // Dropped should be WAITING_FOR_EXIT (lower priority)
      for (const id of dropped) {
        const idx = parseInt(id.split('-')[1]);
        expect(idx).toBeGreaterThanOrEqual(10); // indices 10-24 are WAITING_FOR_EXIT
      }
    });

    it('drops lowest priority when over Android limit', async () => {
      const androidManager = new RegistrationManager(mockRepo, createMockGeofencing(), ANDROID_LIMIT);

      // Populate registrations and mock repo
      for (let i = 0; i < 510; i++) {
        const status = i < 10 ? ReminderStatus.ARMED : ReminderStatus.DRAFT;
        androidManager.addRegistration(`r-${i}`, status);
        // Also add to mock repo so enforceCapacity can find them
        (mockRepo.getAll as any).mockImplementation(() => {
          const reminders: any[] = [];
          for (let j = 0; j < 510; j++) {
            const s = j < 10 ? ReminderStatus.ARMED : ReminderStatus.DRAFT;
            reminders.push(createReminder(`r-${j}`, s));
          }
          return reminders;
        });
      }

      const dropped = await androidManager.enforceCapacity();

      // 510 - 500 = 10 should be dropped (DRAFT has priority 1, ARMED has 3)
      expect(dropped.length).toBe(10);
    });

    it('prioritizes ARMED > WAITING_FOR_EXIT > DRAFT', async () => {
      // Populate registrations and mock repo with mixed priorities
      for (let i = 0; i < 25; i++) {
        const status = i % 3 === 0 ? ReminderStatus.ARMED : i % 3 === 1 ? ReminderStatus.WAITING_FOR_EXIT : ReminderStatus.DRAFT;
        manager.addRegistration(`r-${i}`, status);
        // Also add to mock repo so enforceCapacity can find them
        (mockRepo.getAll as any).mockImplementation(() => {
          const reminders: any[] = [];
          for (let j = 0; j < 25; j++) {
            const s = j % 3 === 0 ? ReminderStatus.ARMED : j % 3 === 1 ? ReminderStatus.WAITING_FOR_EXIT : ReminderStatus.DRAFT;
            reminders.push(createReminder(`r-${j}`, s));
          }
          return reminders;
        });
      }

      const dropped = await manager.enforceCapacity();

      // 5 should be dropped. DRAFT (priority 1) dropped first, then WAITING_FOR_EXIT (priority 2)
      const droppedStatuses = dropped.map((id: string) => {
        const idx = parseInt(id.split('-')[1]);
        return idx % 3; // 0=ARMED, 1=WAITING_FOR_EXIT, 2=DRAFT
      });

      // DRAFT (idx % 3 === 2) should be dropped first
      expect(droppedStatuses.filter((s: number) => s === 2).length).toBe(5); // All 5 dropped are DRAFT
    });
  });

  describe('Register/Unregister', () => {
    it('registers an ARMED reminder', async () => {
      await manager.registerReminder(createReminder('test-1', ReminderStatus.ARMED));

      expect(manager.getRegisteredReminderIds()).toContain('test-1');
      expect(manager.getRegistrationCount()).toBe(1);
    });

    it('registers a WAITING_FOR_EXIT reminder', async () => {
      await manager.registerReminder(createReminder('test-2', ReminderStatus.WAITING_FOR_EXIT));

      expect(manager.getRegisteredReminderIds()).toContain('test-2');
    });

    it('does not register DRAFT reminders', async () => {
      await manager.registerReminder(createReminder('test-3', ReminderStatus.DRAFT));

      expect(manager.getRegisteredReminderIds()).not.toContain('test-3');
    });

    it('does not register TRIGGERED/COMPLETED/CANCELLED reminders', async () => {
      await manager.registerReminder(createReminder('test-4', ReminderStatus.TRIGGERED));
      await manager.registerReminder(createReminder('test-5', ReminderStatus.COMPLETED));
      await manager.registerReminder(createReminder('test-6', ReminderStatus.CANCELLED));

      expect(manager.getRegisteredReminderIds()).not.toContain('test-4');
      expect(manager.getRegisteredReminderIds()).not.toContain('test-5');
      expect(manager.getRegisteredReminderIds()).not.toContain('test-6');
    });

    it('unregisters a reminder', async () => {
      await manager.registerReminder(createReminder('test-7', ReminderStatus.ARMED));
      await manager.unregisterReminder('test-7');

      expect(manager.getRegisteredReminderIds()).not.toContain('test-7');
      expect(manager.getRegistrationCount()).toBe(0);
    });

    it('unregistering non-existent reminder is a no-op', async () => {
      await manager.unregisterReminder('non-existent');

      expect(manager.getRegistrationCount()).toBe(0);
    });

    it('clears all registrations', () => {
      manager.registerReminder(createReminder('test-8', ReminderStatus.ARMED));
      manager.registerReminder(createReminder('test-9', ReminderStatus.WAITING_FOR_EXIT));

      manager.clear();

      expect(manager.getRegistrationCount()).toBe(0);
    });

    it('tracks registration metadata', async () => {
      await manager.registerReminder(createReminder('test-10', ReminderStatus.ARMED));

      const reg = manager.getRegistration('test-10');
      expect(reg).toBeDefined();
      expect(reg!.reminderId).toBe('test-10');
      expect(reg!.status).toBe(ReminderStatus.ARMED);
      expect(typeof reg!.registeredAt).toBe('number');
    });

    it('isRegistered works correctly', async () => {
      expect(manager.isRegistered('test-11')).toBe(false);

      await manager.registerReminder(createReminder('test-11', ReminderStatus.ARMED));

      expect(manager.isRegistered('test-11')).toBe(true);
    });
  });

  describe('registerAll (restart recovery)', () => {
    it('re-registers all eligible reminders', async () => {
      const reminders = [
        createReminder('r-1', ReminderStatus.ARMED),
        createReminder('r-2', ReminderStatus.WAITING_FOR_EXIT),
        createReminder('r-3', ReminderStatus.TRIGGERED),
      ];
      (mockRepo.getAll as any).mockResolvedValue(reminders);

      await manager.registerAll();

      expect(manager.getRegisteredReminderIds()).toContain('r-1');
      expect(manager.getRegisteredReminderIds()).toContain('r-2');
      expect(manager.getRegisteredReminderIds()).not.toContain('r-3');
    });

    it('clears existing registrations before re-registering', async () => {
      await manager.registerReminder(createReminder('old-1', ReminderStatus.ARMED));
      expect(manager.getRegisteredReminderIds()).toContain('old-1');

      const reminders = [
        createReminder('new-1', ReminderStatus.ARMED),
      ];
      (mockRepo.getAll as any).mockResolvedValue(reminders);

      await manager.registerAll();

      expect(manager.getRegisteredReminderIds()).not.toContain('old-1');
      expect(manager.getRegisteredReminderIds()).toContain('new-1');
    });
  });

  describe('Constants', () => {
    it('exports correct priority values', () => {
      expect(PRIORITY[ReminderStatus.ARMED]).toBe(3);
      expect(PRIORITY[ReminderStatus.WAITING_FOR_EXIT]).toBe(2);
      expect(PRIORITY[ReminderStatus.DRAFT]).toBe(1);
      expect(PRIORITY[ReminderStatus.TRIGGERED]).toBe(0);
    });

    it('exports correct limits', () => {
      expect(IOS_LIMIT).toBe(20);
      expect(ANDROID_LIMIT).toBe(500);
    });
  });
});
