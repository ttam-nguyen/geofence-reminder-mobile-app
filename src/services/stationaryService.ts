/**
 * StationaryService — stationary qualification logic for arrival detection.
 *
 * A reminder is "stationary" when the user's speed stays below the configured threshold
 * (< 2 mph = 0.89408 m/s) for a continuous period (default 120 s).
 *
 * Rules:
 * - Each sample is validated: fix timestamp within `validSampleMaxAge`, accuracy ≤ 50 m.
 * - Speed uses the timestamps of the two fixes, never wall-clock time between calls. Using
 *   wall-clock time makes batched or delayed fixes look like stationary time, which produced
 *   false arrivals after the app woke up.
 * - A gap between fixes longer than `maxSampleGapMs` cannot prove the user stayed still, so
 *   accumulation restarts from the new sample.
 * - Speed ≥ threshold resets the accumulated stationary timer.
 * - An EXIT event cancels the arrival candidate.
 */

import { LocationSample } from '../types/location';
import { defaultArrivalConfig } from '../models/arrivalConfig';

export interface StationaryCandidate {
  reminderId: string;
  targetCoordinate: { latitude: number; longitude: number };
  geofenceRadiusMeters: number;
  accumulatedStationaryTimeMs: number;
  lastValidSampleAt: Date | null;
  lastValidSampleLat: number | null;
  lastValidSampleLon: number | null;
  enteredAt: Date;
}

export interface StationaryServiceConfig {
  stationarySpeedThresholdMps?: number;
  maxHorizontalAccuracyMeters?: number;
  validSampleMaxAgeMs?: number;
  requiredStationaryDurationSeconds?: number;
  /** Longest gap between fixes that still counts as continuous presence. */
  maxSampleGapMs?: number;
}

class StationaryService {
  private candidates = new Map<string, StationaryCandidate>();

  constructor(private config: StationaryServiceConfig = {}) {}

  private get stationarySpeedThreshold(): number {
    return this.config.stationarySpeedThresholdMps ?? defaultArrivalConfig.stationarySpeedMps;
  }

  private get validSampleMaxAge(): number {
    return this.config.validSampleMaxAgeMs ?? 5 * 60 * 1000;
  }

  private get maxSampleGap(): number {
    return this.config.maxSampleGapMs ?? 60 * 1000;
  }

  private get maxHorizontalAccuracy(): number {
    return this.config.maxHorizontalAccuracyMeters ?? 50;
  }

  private get requiredStationaryDurationSeconds(): number {
    return this.config.requiredStationaryDurationSeconds ?? defaultArrivalConfig.requiredStationaryDurationSeconds;
  }

  /**
   * Create an arrival candidate when the user is confirmed inside the geofence.
   *
   * An existing candidate keeps its accumulated time: re-entering while already inside
   * (for example after a re-registration or a duplicate ENTER) must not restart the clock.
   */
  startArrivalCandidate(
    reminderId: string,
    targetLat: number,
    targetLon: number,
    geofenceRadiusMeters: number,
  ): StationaryCandidate {
    const existing = this.candidates.get(reminderId);

    if (existing) {
      existing.targetCoordinate = { latitude: targetLat, longitude: targetLon };
      existing.geofenceRadiusMeters = geofenceRadiusMeters;
      return existing;
    }

    const candidate: StationaryCandidate = {
      reminderId,
      targetCoordinate: { latitude: targetLat, longitude: targetLon },
      geofenceRadiusMeters,
      accumulatedStationaryTimeMs: 0,
      lastValidSampleAt: null,
      lastValidSampleLat: null,
      lastValidSampleLon: null,
      enteredAt: new Date(),
    };

    this.candidates.set(reminderId, candidate);
    return candidate;
  }

  /**
   * Restore a candidate after an app restart with time already accumulated.
   * `accumulatedMs` is clamped to the required duration so a stale value cannot fire instantly.
   */
  resumeArrivalCandidate(
    reminderId: string,
    targetLat: number,
    targetLon: number,
    geofenceRadiusMeters: number,
    accumulatedMs: number,
    lastSampleAt: Date | null = null,
  ): StationaryCandidate {
    const candidate = this.startArrivalCandidate(reminderId, targetLat, targetLon, geofenceRadiusMeters);
    const cap = this.requiredStationaryDurationSeconds * 1000;
    candidate.accumulatedStationaryTimeMs = Math.max(0, Math.min(accumulatedMs, cap));
    candidate.lastValidSampleAt = lastSampleAt;
    return candidate;
  }

  cancelArrivalCandidate(reminderId: string): void {
    this.candidates.delete(reminderId);
  }

  hasCandidate(reminderId: string): boolean {
    return this.candidates.has(reminderId);
  }

  /**
   * Process a location sample for stationary qualification.
   * Returns true when the stationary requirement is satisfied.
   */
  processLocationSample(reminderId: string, sample: LocationSample): boolean {
    const candidate = this.candidates.get(reminderId);
    if (!candidate) return false;
    if (!this.isValidSample(sample)) return false;

    const sampleAt = new Date(sample.timestamp);

    // First valid sample — record the baseline; speed needs two fixes.
    if (candidate.lastValidSampleAt === null || candidate.lastValidSampleLat === null || candidate.lastValidSampleLon === null) {
      candidate.lastValidSampleAt = sampleAt;
      candidate.lastValidSampleLat = sample.latitude;
      candidate.lastValidSampleLon = sample.longitude;
      return false;
    }

    const gapMs = sampleAt.getTime() - candidate.lastValidSampleAt.getTime();

    // Out-of-order or duplicate fix: ignore it without moving the baseline backwards.
    if (gapMs <= 0) return false;

    const distanceMeters = this.haversineDistance(
      candidate.lastValidSampleLat,
      candidate.lastValidSampleLon,
      sample.latitude,
      sample.longitude,
    );

    if (gapMs < 1000) {
      // Too close together to derive a trustworthy speed: just advance the baseline.
      this.advanceBaseline(candidate, sample, sampleAt);
      return false;
    }

    const speedMps = distanceMeters / (gapMs / 1000);

    if (gapMs > this.maxSampleGap) {
      // Unknown movement during the gap — restart accumulation from this fix.
      candidate.accumulatedStationaryTimeMs = 0;
    } else if (speedMps >= this.stationarySpeedThreshold) {
      candidate.accumulatedStationaryTimeMs = 0;
    } else {
      candidate.accumulatedStationaryTimeMs += gapMs;
    }

    this.advanceBaseline(candidate, sample, sampleAt);

    const requiredStationaryMs = this.requiredStationaryDurationSeconds * 1000;
    return candidate.accumulatedStationaryTimeMs >= requiredStationaryMs;
  }

  private advanceBaseline(candidate: StationaryCandidate, sample: LocationSample, sampleAt: Date): void {
    candidate.lastValidSampleAt = sampleAt;
    candidate.lastValidSampleLat = sample.latitude;
    candidate.lastValidSampleLon = sample.longitude;
  }

  /** A sample is usable when it is recent enough and accurate enough. */
  private isValidSample(sample: LocationSample): boolean {
    const ageMs = Date.now() - new Date(sample.timestamp).getTime();
    if (!Number.isFinite(ageMs) || ageMs > this.validSampleMaxAge) return false;
    if (sample.horizontalAccuracy === undefined || sample.horizontalAccuracy === null) return false;
    if (sample.horizontalAccuracy > this.maxHorizontalAccuracy) return false;
    return true;
  }

  /** Remaining stationary time for a candidate, for UI feedback. */
  getRemainingStationaryTimeMs(reminderId: string): number | null {
    const candidate = this.candidates.get(reminderId);
    if (!candidate) return null;

    const requiredStationaryMs = this.requiredStationaryDurationSeconds * 1000;
    return Math.max(0, requiredStationaryMs - candidate.accumulatedStationaryTimeMs);
  }

  listCandidates(): StationaryCandidate[] {
    return Array.from(this.candidates.values());
  }

  clearAll(): void {
    this.candidates.clear();
  }

  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export { StationaryService };
