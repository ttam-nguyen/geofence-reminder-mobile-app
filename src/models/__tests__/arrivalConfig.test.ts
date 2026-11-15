import { createArrivalConfig, defaultArrivalConfig } from '../arrivalConfig';

describe('defaultArrivalConfig', () => {
  it('has stationarySpeedMps ≈ 0.89408 (2 mph)', () => {
    expect(defaultArrivalConfig.stationarySpeedMps).toBeCloseTo(0.89408, 5);
  });

  it('has requiredStationaryDurationSeconds = 120 (2 minutes)', () => {
    expect(defaultArrivalConfig.requiredStationaryDurationSeconds).toBe(120);
  });

  it('has maxArrivalTimeoutSeconds = 3600 (1 hour)', () => {
    expect(defaultArrivalConfig.maxArrivalTimeoutSeconds).toBe(3600);
  });
});

describe('createArrivalConfig', () => {
  it('returns defaults when no overrides are provided', () => {
    const config = createArrivalConfig();
    expect(config).toEqual(defaultArrivalConfig);
  });

  it('overrides stationarySpeedMps when provided', () => {
    const config = createArrivalConfig({ stationarySpeedMps: 1.5 });
    expect(config.stationarySpeedMps).toBe(1.5);
    expect(config.requiredStationaryDurationSeconds).toBe(defaultArrivalConfig.requiredStationaryDurationSeconds);
    expect(config.maxArrivalTimeoutSeconds).toBe(defaultArrivalConfig.maxArrivalTimeoutSeconds);
  });

  it('overrides requiredStationaryDurationSeconds when provided', () => {
    const config = createArrivalConfig({ requiredStationaryDurationSeconds: 60 });
    expect(config.requiredStationaryDurationSeconds).toBe(60);
    expect(config.stationarySpeedMps).toBe(defaultArrivalConfig.stationarySpeedMps);
  });

  it('overrides maxArrivalTimeoutSeconds when provided', () => {
    const config = createArrivalConfig({ maxArrivalTimeoutSeconds: 1800 });
    expect(config.maxArrivalTimeoutSeconds).toBe(1800);
  });

  it('applies multiple overrides simultaneously', () => {
    const config = createArrivalConfig({
      stationarySpeedMps: 2.0,
      requiredStationaryDurationSeconds: 30,
      maxArrivalTimeoutSeconds: 600,
    });
    expect(config.stationarySpeedMps).toBe(2.0);
    expect(config.requiredStationaryDurationSeconds).toBe(30);
    expect(config.maxArrivalTimeoutSeconds).toBe(600);
  });

  it('returns a new object each time (no shared mutation)', () => {
    const config1 = createArrivalConfig({ stationarySpeedMps: 1.0 });
    const config2 = createArrivalConfig();
    expect(config1).not.toBe(config2);
  });

  it('supports test overrides for faster testing', () => {
    const testConfig = createArrivalConfig({
      stationarySpeedMps: 10.0, // high threshold for fast test transitions
      requiredStationaryDurationSeconds: 1, // 1 second for tests
      maxArrivalTimeoutSeconds: 30, // 30 seconds max for tests
    });
    expect(testConfig.requiredStationaryDurationSeconds).toBe(1);
  });
});
