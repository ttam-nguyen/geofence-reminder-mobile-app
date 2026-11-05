/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { ReminderStatus } from '../../models/ReminderStatus';
import { LocationSource } from '../../models/LocationSource';
import { createReminder, updateReminder, validateReminder, type ValidationError } from '../../models/Reminder';

describe('ReminderStatus Enum', () => {
  it('has all 6 lifecycle states', () => {
    expect(ReminderStatus.DRAFT).toBe('DRAFT');
    expect(ReminderStatus.WAITING_FOR_EXIT).toBe('WAITING_FOR_EXIT');
    expect(ReminderStatus.ARMED).toBe('ARMED');
    expect(ReminderStatus.TRIGGERED).toBe('TRIGGERED');
    expect(ReminderStatus.COMPLETED).toBe('COMPLETED');
    expect(ReminderStatus.CANCELLED).toBe('CANCELLED');
  });

  it('all values are unique strings', () => {
    const values = Object.values(ReminderStatus);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('LocationSource Enum', () => {
  it('has all 3 source types', () => {
    expect(LocationSource.CURRENT_GPS).toBe('current_gps');
    expect(LocationSource.MAP_PIN).toBe('map_pin');
    expect(LocationSource.PLACE_SEARCH).toBe('place_search');
  });
});

describe('createReminder', () => {
  it('creates a valid reminder with defaults', () => {
    const reminder = createReminder();
    expect(reminder).toHaveProperty('id', '');
    expect(reminder.title).toBe('Untitled Reminder');
    expect(reminder.description).toBeNull();
    expect(reminder.latitude).toBe(0);
    expect(reminder.longitude).toBe(0);
    expect(reminder.locationName).toBeNull();
    expect(reminder.radiusMeters).toBe(50);
    expect(reminder.locationSource).toBe(LocationSource.CURRENT_GPS);
    expect(reminder.status).toBe(ReminderStatus.DRAFT);
    expect(reminder.createdAt).toBeDefined();
    expect(reminder.updatedAt).toBeDefined();
    expect(reminder.triggeredAt).toBeNull();
    expect(reminder.completedAt).toBeNull();
    expect(reminder.notificationSoundEnabled).toBe(true);
    expect(reminder.notificationVibrationEnabled).toBe(true);
  });

  it('applies custom overrides', () => {
    const reminder = createReminder({
      title: 'Test Reminder',
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 100,
      locationSource: LocationSource.MAP_PIN,
    });

    expect(reminder.title).toBe('Test Reminder');
    expect(reminder.latitude).toBe(37.7749);
    expect(reminder.longitude).toBe(-122.4194);
    expect(reminder.radiusMeters).toBe(100);
    expect(reminder.locationSource).toBe(LocationSource.MAP_PIN);
  });

  it('accepts a custom ID', () => {
    const reminder = createReminder({ id: 'test-id-123' });
    expect(reminder.id).toBe('test-id-123');
  });

  it('accepts custom timestamps', () => {
    const customTime = '2024-01-15T10:30:00.000Z';
    const reminder = createReminder({ createdAt: customTime, updatedAt: customTime });
    expect(reminder.createdAt).toBe(customTime);
    expect(reminder.updatedAt).toBe(customTime);
  });
});

describe('updateReminder', () => {
  it('updates fields and sets new updatedAt', async () => {
    const original = createReminder({ id: 'old-id', title: 'Old Title' });
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait to ensure different timestamp
    const updated = updateReminder(original, { title: 'New Title', radiusMeters: 200 });

    expect(updated.id).toBe('old-id'); // ID unchanged
    expect(updated.title).toBe('New Title');
    expect(updated.radiusMeters).toBe(200);
    expect(updated.updatedAt).not.toBe(original.updatedAt); // updatedAt changed
  });

  it('preserves unchanged fields immutably', () => {
    const original = createReminder({ id: 'imm-test' });
    const updated = updateReminder(original, { title: 'Changed' });

    expect(updated.description).toBe(original.description);
    expect(updated.latitude).toBe(original.latitude);
    expect(updated.status).toBe(original.status);
    expect(updated).not.toBe(original); // New object, not mutated
  });

  it('handles partial updates with null values', () => {
    const original = createReminder({ id: 'null-test' });
    const updated = updateReminder(original, { description: null });

    expect(updated.description).toBeNull();
  });
});

describe('validateReminder', () => {
  it('returns no errors for a valid reminder object', () => {
    const errors = validateReminder({
      title: 'Valid Reminder',
      latitude: 37.7749,
      longitude: -122.4194,
      radiusMeters: 50,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects missing title', () => {
    const errors = validateReminder({ latitude: 0, longitude: 0, radiusMeters: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('title');
  });

  it('rejects empty title', () => {
    const errors = validateReminder({ title: '', latitude: 0, longitude: 0, radiusMeters: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('title');
  });

  it('rejects title over 100 characters', () => {
    const longTitle = 'A'.repeat(101);
    const errors = validateReminder({ title: longTitle, latitude: 0, longitude: 0, radiusMeters: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('title');
  });

  it('rejects negative latitude', () => {
    const errors = validateReminder({ title: 'Test', latitude: -91, longitude: 0, radiusMeters: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('latitude');
  });

  it('rejects latitude over 90', () => {
    const errors = validateReminder({ title: 'Test', latitude: 91, longitude: 0, radiusMeters: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('latitude');
  });

  it('rejects longitude over 180', () => {
    const errors = validateReminder({ title: 'Test', latitude: 0, longitude: -181, radiusMeters: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('longitude');
  });

  it('rejects radius below 10', () => {
    const errors = validateReminder({ title: 'Test', latitude: 0, longitude: 0, radiusMeters: 5 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('radiusMeters');
  });

  it('rejects radius above 500', () => {
    const errors = validateReminder({ title: 'Test', latitude: 0, longitude: 0, radiusMeters: 600 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('radiusMeters');
  });

  it('catches multiple validation errors', () => {
    const errors = validateReminder({ title: '', latitude: 100, longitude: -200, radiusMeters: 5 });
    expect(errors.length).toBeGreaterThanOrEqual(3);
    const fields = errors.map((e: ValidationError) => e.field);
    expect(fields).toContain('title');
    expect(fields).toContain('latitude');
    expect(fields).toContain('longitude');
    expect(fields).toContain('radiusMeters');
  });

  it('accepts valid boundary values', () => {
    const errors = validateReminder({ title: 'Test', latitude: -90, longitude: -180, radiusMeters: 10 });
    expect(errors).toHaveLength(0);

    const errors2 = validateReminder({ title: 'Test', latitude: 90, longitude: 180, radiusMeters: 500 });
    expect(errors2).toHaveLength(0);
  });

  it('rejects NaN latitude/longitude', () => {
    const errors = validateReminder({ title: 'Test', latitude: NaN, longitude: 0, radiusMeters: 50 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('latitude');
  });
});
