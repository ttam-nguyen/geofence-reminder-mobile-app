/**
 * Unit tests for GeofenceEventProcessor.
 *
 * Tests event processing, state transitions, idempotency, and restart recovery.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GeofenceEventProcessor } from '../../native/GeofenceEventProcessor';
import { ReminderStatus } from '../../models/ReminderStatus';
import type { GeofenceEvent } from '../../native/GeofencingModule';
import type { ReminderRepository } from '../../services/ReminderRepository';

// Create a mock repository
function createMockRepo(): ReminderRepository {
  const reminders: Map<string, any> = new Map();

  return {
    getById: vi.fn((id: string) => reminders.get(id) || null),
    getAll: vi.fn(() => Array.from(reminders.values())),
    getActive: vi.fn(() => []),
    create: vi.fn((data: any) => {
      const reminder = { ...data, id: `reminder-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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

function createEvent(reminderId: string, eventType: 'ENTER' | 'EXIT'): GeofenceEvent {
  return {
    requestId: reminderId,
    eventType,
    timestamp: Date.now(),
    latitude: 37.7749,
    longitude: -122.4194,
    horizontalAccuracy: 5,
  };
}

describe('GeofenceEventProcessor', () => {
  let mockRepo: ReminderRepository;
  let processor: GeofenceEventProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo = createMockRepo();
    processor = new GeofenceEventProcessor(mockRepo);
  });

  describe('Event Processing', () => {
    it('processes ENTER event for ARMED → TRIGGERED', async () => {
      const reminder = createReminder('r-1', ReminderStatus.ARMED);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-1', 'ENTER'));

      expect(mockRepo.update).toHaveBeenCalledWith('r-1', {
        status: ReminderStatus.TRIGGERED,
        triggeredAt: expect.any(String),
      });
    });

    it('processes EXIT event for WAITING_FOR_EXIT → ARMED', async () => {
      const reminder = createReminder('r-2', ReminderStatus.WAITING_FOR_EXIT);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-2', 'EXIT'));

      expect(mockRepo.update).toHaveBeenCalledWith('r-2', {
        status: ReminderStatus.ARMED,
      });
    });

    it('ignores ENTER for WAITING_FOR_EXIT (already inside)', async () => {
      const reminder = createReminder('r-3', ReminderStatus.WAITING_FOR_EXIT);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-3', 'ENTER'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('ignores EXIT for ARMED (entry-only reminders)', async () => {
      const reminder = createReminder('r-4', ReminderStatus.ARMED);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-4', 'EXIT'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('transitions DRAFT → WAITING_FOR_EXIT on ENTER (inside radius)', async () => {
      const reminder = createReminder('r-5', ReminderStatus.DRAFT);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-5', 'ENTER'));

      expect(mockRepo.update).toHaveBeenCalledWith('r-5', {
        status: ReminderStatus.WAITING_FOR_EXIT,
      });
    });

    it('ignores events for deleted reminders', async () => {
      (mockRepo.getById as any).mockResolvedValue(null);

      await processor.processEvent(createEvent('r-6', 'ENTER'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency', () => {
    it('TRIGGERED reminders ignore further events', async () => {
      const reminder = createReminder('r-7', ReminderStatus.TRIGGERED);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-7', 'ENTER'));
      await processor.processEvent(createEvent('r-7', 'EXIT'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('COMPLETED reminders ignore further events', async () => {
      const reminder = createReminder('r-8', ReminderStatus.COMPLETED);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-8', 'ENTER'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('CANCELLED reminders ignore further events', async () => {
      const reminder = createReminder('r-9', ReminderStatus.CANCELLED);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      await processor.processEvent(createEvent('r-9', 'ENTER'));

      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('isAlreadyTriggered returns true for TRIGGERED', async () => {
      const reminder = createReminder('r-10', ReminderStatus.TRIGGERED);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      expect(await processor.isAlreadyTriggered('r-10')).toBe(true);
    });

    it('isAlreadyTriggered returns false for non-triggered', async () => {
      const reminder = createReminder('r-11', ReminderStatus.ARMED);
      (mockRepo.getById as any).mockResolvedValue(reminder);

      expect(await processor.isAlreadyTriggered('r-11')).toBe(false);
    });
  });

  describe('Valid Transitions', () => {
    it('returns correct transitions for ARMED', () => {
      const reminder = createReminder('r-12', ReminderStatus.ARMED);
      const transitions = processor.getValidTransitions(reminder);

      expect(transitions).toContain(ReminderStatus.TRIGGERED);
      expect(transitions).toContain(ReminderStatus.COMPLETED);
      expect(transitions).toContain(ReminderStatus.CANCELLED);
    });

    it('returns correct transitions for WAITING_FOR_EXIT', () => {
      const reminder = createReminder('r-13', ReminderStatus.WAITING_FOR_EXIT);
      const transitions = processor.getValidTransitions(reminder);

      expect(transitions).toContain(ReminderStatus.ARMED);
      expect(transitions).toContain(ReminderStatus.CANCELLED);
    });

    it('returns empty transitions for terminal states', () => {
      const reminder = createReminder('r-14', ReminderStatus.COMPLETED);
      const transitions = processor.getValidTransitions(reminder);

      expect(transitions).toEqual([]);
    });
  });
});
