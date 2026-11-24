// Regression tests for the reminders-table migration.
//
// Field bug: a database created before `notificationId` was added to the schema kept
// `user_version = 1`, and the old guard `if (version >= 1) return` skipped migrations forever.
// Every save then failed with "table reminders has no column named notificationId".

import { computeMissingColumns } from '../sqliteAdapter';

/** Columns of the first released schema (Phase 5). */
const PHASE_5_COLUMNS = [
  'id',
  'title',
  'description',
  'latitude',
  'longitude',
  'locationName',
  'radiusMeters',
  'locationSource',
  'status',
  'createdAt',
  'updatedAt',
  'triggeredAt',
  'completedAt',
  'notificationSoundEnabled',
  'notificationVibrationEnabled',
];

describe('computeMissingColumns', () => {
  it('detects notificationId and the stationary columns on a Phase 5 database', () => {
    const missing = computeMissingColumns(PHASE_5_COLUMNS).map(column => column.name);

    expect(missing).toContain('notificationId');
    expect(missing).toContain('lastStationaryReadingAt');
    expect(missing).toContain('lastStationaryReadingLat');
    expect(missing).toContain('lastStationaryReadingLon');
  });

  it('does not report the stationary crash-safety columns when they already exist', () => {
    const missing = computeMissingColumns([
      ...PHASE_5_COLUMNS,
      'notificationId',
      'lastStationaryReadingAt',
      'lastStationaryReadingLat',
      'lastStationaryReadingLon',
    ]).map(column => column.name);

    expect(missing).toEqual([]);
  });

  it('reports every canonical column for an empty table description', () => {
    const missing = computeMissingColumns([]).map(column => column.name);

    expect(missing).toContain('title');
    expect(missing).toContain('status');
    expect(missing).toContain('notificationId');
    expect(missing).toHaveLength(18);
  });
});
