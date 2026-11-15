// Arrival verification configuration — injectable for production defaults and test overrides.

/** Configuration parameters for arrival verification. */
export interface ArrivalVerificationConfig {
  /** Maximum speed (m/s) to consider the user "stationary". Default: 0.89408 m/s (≈ 2 mph). */
  stationarySpeedMps: number;

  /** Minimum time (seconds) the user must remain within the geofence AND stationary. Default: 120 seconds (2 minutes). */
  requiredStationaryDurationSeconds: number;

  /** Maximum time (seconds) to wait for arrival before giving up and reverting to ARMED. Default: 3600 seconds (1 hour). */
  maxArrivalTimeoutSeconds: number;
}

/** Default production configuration. */
export const defaultArrivalConfig: ArrivalVerificationConfig = {
  stationarySpeedMps: 0.89408, // ≈ 2 mph
  requiredStationaryDurationSeconds: 120, // 2 minutes
  maxArrivalTimeoutSeconds: 3600, // 1 hour
};

/**
 * Create an arrival verification config with test overrides.
 * @param overrides - Partial config overriding defaults (omit to use all defaults)
 * @returns A new ArrivalVerificationConfig instance
 */
export function createArrivalConfig(
  overrides?: Partial<ArrivalVerificationConfig>,
): ArrivalVerificationConfig {
  return { ...defaultArrivalConfig, ...overrides };
}
