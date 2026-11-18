/**
 * StationaryService — stationary qualification logic for arrival detection.
 *
 * A reminder is "stationary" when its speed (from location samples) is below
 * the configured threshold (< 2 mph = 0.89408 m/s) for a continuous period
 * (default: 120 seconds).
 *
 * Rules:
 * - Each location sample is validated: timestamp < 5 min old, horizontalAccuracy ≤ 50m.
 * - Invalid/missing samples do NOT count toward stationary time.
 * - Speed ≥ threshold resets the accumulated stationary timer.
 * - Exiting the geofence (EXIT event) cancels the arrival candidate.
 */

import { LocationSample } from '../types/location';
import { defaultArrivalConfig } from '../models/arrivalConfig';

export interface StationaryCandidate {
  reminderId: string;
  targetCoordinate: { latitude: number; longitude: number };
  geofenceRadiusMeters: number;
  accumulatedStationaryTimeMs: number; // ms
  lastValidSampleAt: Date | null;
}

export interface StationaryServiceConfig {
  stationarySpeedThresholdMps?: number;
  maxHorizontalAccuracyMeters?: number;
  validSampleMaxAgeMs?: number;
  requiredStationaryDurationSeconds?: number;
}

class StationaryService {
  private candidates = new Map<string, StationaryCandidate>();

  constructor(private config: StationaryServiceConfig = {}) {}

  private get stationarySpeedThreshold(): number {
    return this.config.stationarySpeedThresholdMps ?? defaultArrivalConfig.stationarySpeedMps;
  }

  private get validSampleMaxAge(): number {
    return this.config.validSampleMaxAgeMs ?? 5 * 60 * 1000; // 5 minutes
  }

  private get requiredStationaryDurationSeconds(): number {
    return this.config.requiredStationaryDurationSeconds ?? defaultArrivalConfig.requiredStationaryDurationSeconds;
  }

  /**
   * Create an arrival candidate when a geofence ENTER event is received.
   */
  startArrivalCandidate(reminderId: string, targetLat: number, targetLon: number, geofenceRadiusMeters: number): void {
    // If a candidate already exists (re-ENTER), reset the timer.
    this.candidates.set(reminderId, {
      reminderId,
      targetCoordinate: { latitude: targetLat, longitude: targetLon },
      geofenceRadiusMeters,
      accumulatedStationaryTimeMs: 0,
      lastValidSampleAt: null,
    });
  }

  /**
   * Cancel an arrival candidate (on EXIT event or manual cancel).
   */
  cancelArrivalCandidate(reminderId: string): void {
    this.candidates.delete(reminderId);
  }

  /**
   * Process a location sample for stationary qualification.
   * Returns true if the user has been stationary long enough to trigger arrival.
   */
  processLocationSample(reminderId: string, sample: LocationSample): boolean {
    const candidate = this.candidates.get(reminderId);
    if (!candidate) return false;

    // Validate the sample.
    if (!this.isValidSample(sample)) {
      return false;
    }

    const now = new Date();

    // Calculate speed from the last valid sample (if available).
    if (candidate.lastValidSampleAt) {
      const timeDiffSeconds = (now.getTime() - candidate.lastValidSampleAt.getTime()) / 1000;

      // Skip samples that are too close together (noise).
      if (timeDiffSeconds < 1) {
        candidate.lastValidSampleAt = now;
        return false;
      }

      const distanceMeters = this.haversineDistance(
        candidate.targetCoordinate.latitude,
        candidate.targetCoordinate.longitude,
        sample.latitude,
        sample.longitude
      );

      const speedMps = distanceMeters / timeDiffSeconds;

      if (speedMps >= this.stationarySpeedThreshold) {
        // User moved too fast — reset stationary timer.
        candidate.accumulatedStationaryTimeMs = 0;
        candidate.lastValidSampleAt = now;
        return false;
      }

      // Speed is below threshold — accumulate stationary time.
      candidate.accumulatedStationaryTimeMs += timeDiffSeconds * 1000;
      candidate.lastValidSampleAt = now;

      // Check if stationary duration threshold is reached.
      const requiredStationaryMs = this.requiredStationaryDurationSeconds * 1000;
      if (candidate.accumulatedStationaryTimeMs >= requiredStationaryMs) {
        return true; // Stationary qualification met!
      }
    } else {
      // First valid sample — just record it.
      candidate.lastValidSampleAt = now;
    }

    return false;
  }

  /**
   * Check if a location sample is valid for stationary qualification.
   */
  private isValidSample(sample: LocationSample): boolean {
    const now = new Date();
    const sampleAgeMs = now.getTime() - new Date(sample.timestamp).getTime();

    // Sample must be recent (< 5 minutes old).
    if (sampleAgeMs > this.validSampleMaxAge) return false;

    // Horizontal accuracy must be ≤ 50m (or NaN/unlimited is invalid).
    if (sample.horizontalAccuracy === undefined || sample.horizontalAccuracy === null) return false;
    if (sample.horizontalAccuracy > 50) return false;

    return true;
  }

  /**
   * Get remaining stationary time for a candidate (for UI display).
   */
  getRemainingStationaryTimeMs(reminderId: string): number | null {
    const candidate = this.candidates.get(reminderId);
    if (!candidate) return null;

    const requiredStationaryMs = this.requiredStationaryDurationSeconds * 1000;
    const remainingMs = requiredStationaryMs - candidate.accumulatedStationaryTimeMs;
    return Math.max(0, remainingMs);
  }

  /**
   * List all active arrival candidates.
   */
  listCandidates(): StationaryCandidate[] {
    return Array.from(this.candidates.values());
  }

  /**
   * Clear all candidates (called on app exit or full reset).
   */
  clearAll(): void {
    this.candidates.clear();
  }

  /**
   * Haversine distance in meters.
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export { StationaryService };
