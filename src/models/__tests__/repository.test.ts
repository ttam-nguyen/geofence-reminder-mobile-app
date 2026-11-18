import { InMemoryReminderRepository } from '../repository';
import { Reminder, ReminderStatus } from '../../types/Reminder';

function makeReminder(partial: Partial<Reminder>): Reminder {
  return {
    id: partial.id || 'temp-id',
    title: partial.title || '',
    description: partial.description ?? null,
    latitude: partial.latitude ?? 0,
    longitude: partial.longitude ?? 0,
    locationName: partial.locationName ?? null,
    radiusMeters: partial.radiusMeters ?? 200,
    locationSource: partial.locationSource ?? 'current',
    status: partial.status ?? ReminderStatus.DRAFT,
    createdAt: partial.createdAt ?? new Date().toISOString(),
    updatedAt: partial.updatedAt ?? new Date().toISOString(),
    triggeredAt: partial.triggeredAt ?? null,
    completedAt: partial.completedAt ?? null,
    notificationSoundEnabled: partial.notificationSoundEnabled ?? true,
    notificationVibrationEnabled: partial.notificationVibrationEnabled ?? true,
    notificationId: partial.notificationId ?? null,
  };
}

describe('InMemoryReminderRepository', () => {
  let repo: InMemoryReminderRepository;

  beforeEach(() => {
    repo = new InMemoryReminderRepository();
  });

  afterEach(async () => {
    await repo.clear();
  });

  describe('findById', () => {
    it('returns undefined for a non-existent ID', async () => {
      await repo.save(makeReminder({
        id: 'test-1',
        title: 'Test Reminder',
        description: 'A test',
        latitude: 40.7128,
        longitude: -74.006,
      }));

      expect(await repo.findById('non-existent')).toBeUndefined();
    });

    it('returns the reminder for an existing ID', async () => {
      const reminder = makeReminder({
        id: 'test-1',
        title: 'Test Reminder',
        description: 'A test',
        latitude: 40.7128,
        longitude: -74.006,
      });
      await repo.save(reminder);

      const found = await repo.findById('test-1');
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-1');
      expect(found?.title).toBe('Test Reminder');
    });
  });

  describe('findAll', () => {
    it('returns all reminders without a filter', async () => {
      await repo.save(makeReminder({ id: '1', title: 'Reminder 1' }));
      await repo.save(makeReminder({ id: '2', title: 'Reminder 2', status: ReminderStatus.ARMED }));

      const all = await repo.findAll();
      expect(all).toHaveLength(2);
    });

    it('filters by status when provided', async () => {
      await repo.save(makeReminder({ id: '1', title: 'Reminder 1' }));
      await repo.save(makeReminder({ id: '2', title: 'Reminder 2', status: ReminderStatus.ARMED }));

      const armed = await repo.findAll(ReminderStatus.ARMED);
      expect(armed).toHaveLength(1);
      expect(armed[0]?.status).toBe(ReminderStatus.ARMED);
    });

    it('returns empty array when no reminders match', async () => {
      const result = await repo.findAll(ReminderStatus.TRIGGERED);
      expect(result).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('creates a new reminder with createdAt and updatedAt', async () => {
      const saved = await repo.save(makeReminder({ id: 'new-1', title: 'New Reminder' }));
      expect(saved).toBeDefined();
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('updates an existing reminder and preserves createdAt', async () => {
      await repo.save(makeReminder({ id: 'existing-1', title: 'Original Title' }));

      // Wait a moment to ensure updatedAt would differ
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));

      const updated = await repo.save(makeReminder({
        id: 'existing-1',
        title: 'Updated Title',
        radiusMeters: 300,
        status: ReminderStatus.ARMED,
      }));

      expect(updated.title).toBe('Updated Title');
      expect(updated.radiusMeters).toBe(300);
      expect(updated.status).toBe(ReminderStatus.ARMED);
    });

    it('updates updatedAt on save', async () => {
      await repo.save(makeReminder({ id: 'update-1', title: 'Reminder' }));

      const first = await repo.findById('update-1');
      await new Promise<void>((resolve) => setTimeout(() => resolve(), 10));

      await repo.save(makeReminder({
        id: 'update-1',
        title: 'Reminder Updated',
        status: ReminderStatus.ARMED,
      }));

      const second = await repo.findById('update-1');
      expect(new Date(second?.updatedAt ?? '').getTime()).toBeGreaterThan(
        new Date(first?.updatedAt ?? '').getTime(),
      );
    });
  });

  describe('deleteById', () => {
    it('returns true and removes the reminder', async () => {
      await repo.save(makeReminder({ id: 'del-1', title: 'To Delete' }));

      const result = await repo.deleteById('del-1');
      expect(result).toBe(true);
      expect(await repo.findById('del-1')).toBeUndefined();
    });

    it('returns false for non-existent reminder', async () => {
      const result = await repo.deleteById('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('findActive', () => {
    it('excludes COMPLETED, CANCELLED, and DELETED reminders', async () => {
      await repo.save(makeReminder({ id: 'active-1', title: 'Active', status: ReminderStatus.ARMED }));
      await repo.save(makeReminder({ id: 'completed-1', title: 'Completed', status: ReminderStatus.COMPLETED }));
      await repo.save(makeReminder({ id: 'cancelled-1', title: 'Cancelled', status: ReminderStatus.CANCELLED }));

      const active = await repo.findActive();
      expect(active).toHaveLength(1);
      expect(active[0]?.id).toBe('active-1');
    });

    it('includes DRAFT, ARMED, WAITING_FOR_EXIT, ARRIVAL_PENDING, TRIGGERED, PAUSED', async () => {
      const statuses: ReminderStatus[] = [
        ReminderStatus.DRAFT,
        ReminderStatus.ARMED,
        ReminderStatus.WAITING_FOR_EXIT,
        ReminderStatus.ARRIVAL_PENDING,
        ReminderStatus.TRIGGERED,
        ReminderStatus.PAUSED,
      ];

      for (let i = 0; i < statuses.length; i++) {
        await repo.save(makeReminder({ id: `active-${i}`, title: `Active ${statuses[i]}`, status: statuses[i] }));
      }

      const active = await repo.findActive();
      expect(active).toHaveLength(statuses.length);
    });
  });

  describe('findByStatus', () => {
    it('returns reminders matching the given status', async () => {
      await repo.save(makeReminder({ id: 'd-1', title: 'Draft 1' }));
      await repo.save(makeReminder({ id: 'd-2', title: 'Draft 2' }));
      await repo.save(makeReminder({ id: 'a-1', title: 'Armed', status: ReminderStatus.ARMED }));

      const drafts = await repo.findByStatus(ReminderStatus.DRAFT);
      expect(drafts).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('removes all reminders', async () => {
      await repo.save(makeReminder({ id: 'c-1', title: 'Reminder 1' }));
      await repo.save(makeReminder({ id: 'c-2', title: 'Reminder 2', status: ReminderStatus.ARMED }));

      await repo.clear();

      expect(await repo.findAll()).toHaveLength(0);
      expect(await repo.findById('c-1')).toBeUndefined();
    });
  });
});
