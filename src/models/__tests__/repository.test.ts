import { InMemoryReminderRepository } from '../repository';
import { ReminderStatus } from '../../types/Reminder';

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
      await repo.save({
        id: 'test-1',
        title: 'Test Reminder',
        description: 'A test',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });

      expect(repo.findById('non-existent')).toBeUndefined();
    });

    it('returns the reminder for an existing ID', async () => {
      const reminder = {
        id: 'test-1',
        title: 'Test Reminder',
        description: 'A test',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      };
      await repo.save(reminder);

      const found = repo.findById('test-1');
      expect(found).toBeDefined();
      expect(found?.id).toBe('test-1');
      expect(found?.title).toBe('Test Reminder');
    });
  });

  describe('findAll', () => {
    it('returns all reminders without a filter', async () => {
      await repo.save({
        id: '1',
        title: 'Reminder 1',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });
      await repo.save({
        id: '2',
        title: 'Reminder 2',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.ARMED,
      });

      const all = repo.findAll();
      expect(all).toHaveLength(2);
    });

    it('filters by status when provided', async () => {
      await repo.save({
        id: '1',
        title: 'Reminder 1',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });
      await repo.save({
        id: '2',
        title: 'Reminder 2',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.ARMED,
      });

      const armed = repo.findAll(ReminderStatus.ARMED);
      expect(armed).toHaveLength(1);
      expect(armed[0]?.status).toBe(ReminderStatus.ARMED);
    });

    it('returns empty array when no reminders match', () => {
      const result = repo.findAll(ReminderStatus.TRIGGERED);
      expect(result).toHaveLength(0);
    });
  });

  describe('save', () => {
    it('creates a new reminder with createdAt and updatedAt', async () => {
      const reminder = {
        id: 'new-1',
        title: 'New Reminder',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      };

      const saved = await repo.save(reminder);
      expect(saved).toBeDefined();
      expect(saved.createdAt).toBeDefined();
      expect(saved.updatedAt).toBeDefined();
    });

    it('updates an existing reminder and preserves createdAt', async () => {
      const now = new Date().toISOString();
      await repo.save({
        id: 'existing-1',
        title: 'Original Title',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });

      // Wait a moment to ensure updatedAt would differ
      await new Promise((r) => setTimeout(r, 10));

      const updated = await repo.save({
        id: 'existing-1',
        title: 'Updated Title',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 300,
        status: ReminderStatus.ARMED,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.radiusMeters).toBe(300);
      expect(updated.status).toBe(ReminderStatus.ARMED);
    });

    it('updates updatedAt on save', async () => {
      await repo.save({
        id: 'update-1',
        title: 'Reminder',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });

      const first = repo.findById('update-1');
      await new Promise((r) => setTimeout(r, 10));

      await repo.save({
        id: 'update-1',
        title: 'Reminder Updated',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.ARMED,
      });

      const second = repo.findById('update-1');
      expect(new Date(second?.updatedAt ?? '').getTime()).toBeGreaterThan(
        new Date(first?.updatedAt ?? '').getTime(),
      );
    });
  });

  describe('deleteById', () => {
    it('returns true and removes the reminder', async () => {
      await repo.save({
        id: 'del-1',
        title: 'To Delete',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });

      const result = await repo.deleteById('del-1');
      expect(result).toBe(true);
      expect(repo.findById('del-1')).toBeUndefined();
    });

    it('returns false for non-existent reminder', async () => {
      const result = await repo.deleteById('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('findActive', () => {
    it('excludes COMPLETED, CANCELLED, and DELETED reminders', async () => {
      await repo.save({
        id: 'active-1',
        title: 'Active',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.ARMED,
      });
      await repo.save({
        id: 'completed-1',
        title: 'Completed',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.COMPLETED,
      });
      await repo.save({
        id: 'cancelled-1',
        title: 'Cancelled',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.CANCELLED,
      });

      const active = repo.findActive();
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
        await repo.save({
          id: `active-${i}`,
          title: `Active ${statuses[i]}`,
          targetLatitude: 40.7128,
          targetLongitude: -74.006,
          radiusMeters: 200,
          status: statuses[i],
        });
      }

      const active = repo.findActive();
      expect(active).toHaveLength(statuses.length);
    });
  });

  describe('findByStatus', () => {
    it('returns reminders matching the given status', async () => {
      await repo.save({
        id: 'd-1',
        title: 'Draft 1',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });
      await repo.save({
        id: 'd-2',
        title: 'Draft 2',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });
      await repo.save({
        id: 'a-1',
        title: 'Armed',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.ARMED,
      });

      const drafts = repo.findByStatus(ReminderStatus.DRAFT);
      expect(drafts).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('removes all reminders', async () => {
      await repo.save({
        id: 'c-1',
        title: 'Reminder 1',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.DRAFT,
      });
      await repo.save({
        id: 'c-2',
        title: 'Reminder 2',
        targetLatitude: 40.7128,
        targetLongitude: -74.006,
        radiusMeters: 200,
        status: ReminderStatus.ARMED,
      });

      await repo.clear();

      expect(repo.findAll()).toHaveLength(0);
      expect(repo.findById('c-1')).toBeUndefined();
    });
  });
});
