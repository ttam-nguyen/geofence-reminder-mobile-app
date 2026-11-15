import { determineInitialStatus } from '../initialStatus';
import { ReminderStatus } from '../../types/Reminder';

describe('determineInitialStatus', () => {
  it('returns WAITING_FOR_EXIT when user is inside the geofence', () => {
    const status = determineInitialStatus(
      40.7128, // user lat (inside)
      -74.006, // user lon
      40.7138, // target lat (close)
      -74.005, // target lon
      200, // 200m radius
    );
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });

  it('returns WAITING_FOR_EXIT when user is exactly on the boundary', () => {
    // User at same point as target — distance = 0, which is <= radius
    const status = determineInitialStatus(
      40.7128,
      -74.006,
      40.7128,
      -74.006,
      100,
    );
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });

  it('returns ARMED when user is outside the geofence', () => {
    const status = determineInitialStatus(
      40.7128, // user (far from target)
      -74.006,
      34.0522, // target (LA)
      -118.2437,
      200, // small radius
    );
    expect(status).toBe(ReminderStatus.ARMED);
  });

  it('returns ARMED when user is just outside the radius', () => {
    // User ~201m away (just outside 200m radius)
    // Move target ~201m north of user
    const status = determineInitialStatus(
      40.7128, // user lat
      -74.006, // user lon
      40.7146, // target ~201m north (1° lat ≈ 111km; 0.0018° ≈ 200m)
      -74.006, // same longitude
      200,
    );
    expect(status).toBe(ReminderStatus.ARMED);
  });

  it('returns WAITING_FOR_EXIT for a large radius when user is nearby', () => {
    const status = determineInitialStatus(
      40.7128,
      -74.006,
      40.7128,
      -74.006,
      500, // max radius
    );
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });
});
