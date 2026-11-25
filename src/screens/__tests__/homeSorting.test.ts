// Tests for the Home list ordering: status priority, then distance, then title.

import { compareReminders } from '../HomeScreen';
import { Reminder, ReminderStatus } from '../../types/Reminder';

function makeReminder(partial: Partial<Reminder> & { title: string }): Reminder {
  return {
    id: partial.id ?? partial.title,
    title: partial.title,
    description: null,
    latitude: partial.latitude ?? 0,
    longitude: partial.longitude ?? 0,
    locationName: partial.locationName ?? null,
    radiusMeters: 200,
    locationSource: 'current',
    status: partial.status ?? ReminderStatus.ARMED,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    triggeredAt: null,
    completedAt: null,
    notificationId: null,
    notificationSoundEnabled: true,
    notificationVibrationEnabled: true,
    lastStationaryReadingAt: null,
    lastStationaryReadingLat: null,
    lastStationaryReadingLon: null,
  };
}

const ORIGIN = { latitude: 45.66, longitude: -122.61 };

describe('compareReminders', () => {
  it('orders Waiting for Exit before Active before Triggered', () => {
    const waiting = makeReminder({ title: 'waiting', status: ReminderStatus.WAITING_FOR_EXIT });
    const active = makeReminder({ title: 'active', status: ReminderStatus.ARMED });
    const triggered = makeReminder({ title: 'triggered', status: ReminderStatus.TRIGGERED });

    const sorted = [triggered, active, waiting].sort((a, b) => compareReminders(a, b, ORIGIN));

    expect(sorted.map(reminder => reminder.title)).toEqual(['waiting', 'active', 'triggered']);
  });

  it('orders by distance inside the same status', () => {
    const near = makeReminder({ title: 'near', latitude: 45.6601, longitude: -122.61 });
    const far = makeReminder({ title: 'far', latitude: 45.9, longitude: -122.61 });

    const sorted = [far, near].sort((a, b) => compareReminders(a, b, ORIGIN));

    expect(sorted.map(reminder => reminder.title)).toEqual(['near', 'far']);
  });

  it('falls back to alphanumeric title order when the distance ties', () => {
    const b = makeReminder({ title: 'Bakery' });
    const a = makeReminder({ title: 'Auto shop' });
    const ten = makeReminder({ title: 'Store 10' });
    const two = makeReminder({ title: 'Store 2' });

    const sorted = [b, ten, a, two].sort((x, y) => compareReminders(x, y, ORIGIN));

    expect(sorted.map(reminder => reminder.title)).toEqual(['Auto shop', 'Bakery', 'Store 2', 'Store 10']);
  });

  it('orders by title when no position is known', () => {
    const far = makeReminder({ title: 'Zoo', latitude: 10, longitude: 10 });
    const near = makeReminder({ title: 'Arena', latitude: 45.6601, longitude: -122.61 });

    const sorted = [far, near].sort((a, b) => compareReminders(a, b, null));

    expect(sorted.map(reminder => reminder.title)).toEqual(['Arena', 'Zoo']);
  });

  it('keeps status priority even when the nearer reminder is a lower priority', () => {
    const waitingFar = makeReminder({
      title: 'waiting far',
      status: ReminderStatus.WAITING_FOR_EXIT,
      latitude: 46.5,
    });
    const activeNear = makeReminder({ title: 'active near', latitude: 45.6601, longitude: -122.61 });

    const sorted = [activeNear, waitingFar].sort((a, b) => compareReminders(a, b, ORIGIN));

    expect(sorted.map(reminder => reminder.title)).toEqual(['waiting far', 'active near']);
  });
});
