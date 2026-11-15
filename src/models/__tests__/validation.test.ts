import {
  validateTitle,
  validateDescription,
  validateLatitude,
  validateLongitude,
  clampRadius,
  validateRadius,
  validateReminderPayload,
  MAX_TITLE_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_RADIUS_METERS,
  MIN_RADIUS_METERS,
} from '../validation';

describe('validateTitle', () => {
  it('returns null for a valid title', () => {
    expect(validateTitle('Meeting at office')).toBeNull();
  });

  it('returns error for empty title', () => {
    const err = validateTitle('');
    expect(err).not.toBeNull();
    expect(err?.field).toBe('title');
  });

  it('returns error for whitespace-only title', () => {
    const err = validateTitle('   ');
    expect(err).not.toBeNull();
  });

  it('returns error for title exceeding MAX_TITLE_LENGTH', () => {
    const longTitle = 'A'.repeat(MAX_TITLE_LENGTH + 1);
    const err = validateTitle(longTitle);
    expect(err).not.toBeNull();
  });

  it('accepts title at exactly MAX_TITLE_LENGTH', () => {
    const exactTitle = 'A'.repeat(MAX_TITLE_LENGTH);
    expect(validateTitle(exactTitle)).toBeNull();
  });

  it('includes the word "required" for empty titles', () => {
    const err = validateTitle('');
    expect(err?.message).toContain('required');
  });

  it('includes max length in the error for too-long titles', () => {
    const err = validateTitle('A'.repeat(MAX_TITLE_LENGTH + 1));
    expect(err?.message).toContain(`${MAX_TITLE_LENGTH}`);
  });
});

describe('validateDescription', () => {
  it('returns null for a valid description', () => {
    expect(validateDescription('Some details')).toBeNull();
  });

  it('returns null for undefined description (defaults to empty)', () => {
    expect(validateDescription(undefined)).toBeNull();
  });

  it('returns null for empty string description', () => {
    expect(validateDescription('')).toBeNull();
  });

  it('returns error for description exceeding MAX_DESCRIPTION_LENGTH', () => {
    const longDesc = 'A'.repeat(MAX_DESCRIPTION_LENGTH + 1);
    const err = validateDescription(longDesc);
    expect(err).not.toBeNull();
  });

  it('accepts description at exactly MAX_DESCRIPTION_LENGTH', () => {
    const exactDesc = 'A'.repeat(MAX_DESCRIPTION_LENGTH);
    expect(validateDescription(exactDesc)).toBeNull();
  });
});

describe('validateLatitude', () => {
  it('returns null for valid latitudes', () => {
    expect(validateLatitude(0)).toBeNull();
    expect(validateLatitude(45.5)).toBeNull();
    expect(validateLatitude(-45.5)).toBeNull();
    expect(validateLatitude(90)).toBeNull();
    expect(validateLatitude(-90)).toBeNull();
  });

  it('returns error for latitude > 90', () => {
    const err = validateLatitude(91);
    expect(err).not.toBeNull();
  });

  it('returns error for latitude < -90', () => {
    const err = validateLatitude(-91);
    expect(err).not.toBeNull();
  });

  it('returns error for NaN', () => {
    const err = validateLatitude(NaN);
    expect(err).not.toBeNull();
  });

  it('returns error for non-number', () => {
    const err = validateLatitude('45' as unknown as number);
    expect(err).not.toBeNull();
  });
});

describe('validateLongitude', () => {
  it('returns null for valid longitudes', () => {
    expect(validateLongitude(0)).toBeNull();
    expect(validateLongitude(180)).toBeNull();
    expect(validateLongitude(-180)).toBeNull();
  });

  it('returns error for longitude > 180', () => {
    const err = validateLongitude(181);
    expect(err).not.toBeNull();
  });

  it('returns error for longitude < -180', () => {
    const err = validateLongitude(-181);
    expect(err).not.toBeNull();
  });

  it('returns error for NaN', () => {
    const err = validateLongitude(NaN);
    expect(err).not.toBeNull();
  });
});

describe('clampRadius', () => {
  it('returns the radius when within range', () => {
    expect(clampRadius(100)).toBe(100);
    expect(clampRadius(250)).toBe(250);
  });

  it('returns MIN_RADIUS_METERS for zero or negative', () => {
    expect(clampRadius(0)).toBe(MIN_RADIUS_METERS);
    expect(clampRadius(-100)).toBe(MIN_RADIUS_METERS);
  });

  it('returns MAX_RADIUS_METERS for values above max', () => {
    expect(clampRadius(1000)).toBe(MAX_RADIUS_METERS);
  });

  it('returns MIN_RADIUS_METERS for values below min', () => {
    expect(clampRadius(5)).toBe(MIN_RADIUS_METERS);
  });

  it('returns MIN_RADIUS_METERS for NaN', () => {
    expect(clampRadius(NaN)).toBe(MIN_RADIUS_METERS);
  });
});

describe('validateRadius', () => {
  it('returns null for valid radii', () => {
    expect(validateRadius(10)).toBeNull();
    expect(validateRadius(250)).toBeNull();
    expect(validateRadius(500)).toBeNull();
  });

  it('returns error for radius below MIN_RADIUS_METERS', () => {
    const err = validateRadius(5);
    expect(err).not.toBeNull();
  });

  it('returns error for radius above MAX_RADIUS_METERS', () => {
    const err = validateRadius(1000);
    expect(err).not.toBeNull();
  });

  it('returns error for NaN', () => {
    const err = validateRadius(NaN);
    expect(err).not.toBeNull();
  });

  it('includes min/max values in error messages', () => {
    const lowErr = validateRadius(5);
    expect(lowErr?.message).toContain(`${MIN_RADIUS_METERS}`);

    const highErr = validateRadius(1000);
    expect(highErr?.message).toContain(`${MAX_RADIUS_METERS}`);
  });
});

describe('validateReminderPayload', () => {
  it('returns valid for a complete valid payload', () => {
    const result = validateReminderPayload(
      'Meeting',
      'Discuss project',
      40.7128,
      -74.006,
      200,
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('collects all validation errors', () => {
    const result = validateReminderPayload('', undefined, 91, 200, 5);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('reports missing title as an error', () => {
    const result = validateReminderPayload('');
    expect(result.valid).toBe(false);
    expect(result.errors.find((e) => e.field === 'title')).toBeDefined();
  });

  it('reports invalid coordinates', () => {
    const result = validateReminderPayload('Test', undefined, 100, -200);
    expect(result.valid).toBe(false);
    const latErr = result.errors.find((e) => e.field === 'latitude');
    const lonErr = result.errors.find((e) => e.field === 'longitude');
    expect(latErr).toBeDefined();
    expect(lonErr).toBeDefined();
  });

  it('reports invalid radius', () => {
    const result = validateReminderPayload('Test', undefined, 40.7128, -74.006, 5);
    expect(result.valid).toBe(false);
    const radiusErr = result.errors.find((e) => e.field === 'radius');
    expect(radiusErr).toBeDefined();
  });

  it('is valid with minimal required fields', () => {
    const result = validateReminderPayload('Test', undefined, 40.7128, -74.006, 200);
    expect(result.valid).toBe(true);
  });
});
