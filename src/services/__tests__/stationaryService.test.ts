import { StationaryService } from '../stationaryService';
import type { LocationSample } from '../../types/location';

describe('StationaryService', () => {
  let service: StationaryService;

  const makeSample = (overrides: Partial<LocationSample> = {}): LocationSample => ({
    latitude: 37.7749,
    longitude: -122.4194,
    timestamp: new Date(Date.now() - 30_000).toISOString(), // 30 seconds ago
    horizontalAccuracy: 10,
    ...overrides,
  });

  beforeEach(() => {
    service = new StationaryService();
  });

  describe('startArrivalCandidate', () => {
    it('creates a candidate with zero accumulated time', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      const candidates = service.listCandidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].reminderId).toBe('reminder-1');
      expect(candidates[0].accumulatedStationaryTimeMs).toBe(0);
    });

    it('replaces existing candidate (reset on re-ENTER)', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      // Simulate accumulating some stationary time.
      const candidate = service['candidates'].get('reminder-1');
      if (candidate) {
        candidate.accumulatedStationaryTimeMs = 60_000; // 60 seconds
      }

      // Re-ENTER should reset.
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      const candidates = service.listCandidates();
      expect(candidates).toHaveLength(1);
      expect(candidates[0].accumulatedStationaryTimeMs).toBe(0);
    });
  });

  describe('cancelArrivalCandidate', () => {
    it('removes a candidate by reminderId', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      service.cancelArrivalCandidate('reminder-1');
      expect(service.listCandidates()).toHaveLength(0);
    });

    it('no-op for unknown reminderId', () => {
      service.cancelArrivalCandidate('non-existent');
      expect(service.listCandidates()).toHaveLength(0);
    });
  });

  describe('processLocationSample', () => {
    it('returns false when no candidate exists', () => {
      const sample = makeSample();
      expect(service.processLocationSample('unknown-reminder', sample)).toBe(false);
    });

    it('returns false when sample is too old (> 5 minutes)', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      const oldSample = makeSample({ timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() });
      expect(service.processLocationSample('reminder-1', oldSample)).toBe(false);
    });

    it('returns false when horizontal accuracy is too high (> 50m)', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      const inaccurateSample = makeSample({ horizontalAccuracy: 100 });
      expect(service.processLocationSample('reminder-1', inaccurateSample)).toBe(false);
    });

    it('returns false when horizontal accuracy is null', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      const noAccuracySample = makeSample({ horizontalAccuracy: null });
      expect(service.processLocationSample('reminder-1', noAccuracySample)).toBe(false);
    });

    it('records first valid sample and returns false (not yet stationary)', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      const sample = makeSample();
      expect(service.processLocationSample('reminder-1', sample)).toBe(false);

      // Candidate should have a lastValidSampleAt set.
      const candidates = service.listCandidates();
      expect(candidates[0].lastValidSampleAt).not.toBeNull();
    });

    it('resets stationary timer when speed exceeds threshold (≥ 2 mph)', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      // First valid sample — just records it.
      const sample1 = makeSample();
      expect(service.processLocationSample('reminder-1', sample1)).toBe(false);

      // Simulate a fast-moving sample (user moved 50m in 10 seconds = 5 m/s >> 0.89408).
      const fastSample = makeSample({
        latitude: 37.7794, // moved ~50m north
        longitude: -122.4194,
      });
      // Manually advance the candidate's lastValidSampleAt to 10 seconds ago.
      const candidate = service['candidates'].get('reminder-1');
      if (candidate) {
        candidate.lastValidSampleAt = new Date(Date.now() - 10_000);
      }

      expect(service.processLocationSample('reminder-1', fastSample)).toBe(false);

      // Timer should be reset.
      const updated = service['candidates'].get('reminder-1');
      expect(updated?.accumulatedStationaryTimeMs).toBe(0);
    });

    it('accumulates stationary time when speed is below threshold', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      // First sample — just records it.
      const sample1 = makeSample();
      expect(service.processLocationSample('reminder-1', sample1)).toBe(false);

      // Second sample — very close to first (speed < 0.89408 m/s).
      const sample2 = makeSample({
        latitude: 37.77491, // ~1m from first (very slow movement)
        longitude: -122.4194,
      });

      // Manually set the candidate's lastValidSampleAt to 130 seconds ago
      // so the accumulated time exceeds 120s threshold.
      const candidate = service['candidates'].get('reminder-1');
      if (candidate) {
        candidate.lastValidSampleAt = new Date(Date.now() - 130_000);
      }

      const triggered = service.processLocationSample('reminder-1', sample2);
      expect(triggered).toBe(true);
    });

    it('does NOT trigger when accumulated time is below threshold', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      const sample1 = makeSample();
      expect(service.processLocationSample('reminder-1', sample1)).toBe(false);

      // Second sample — close enough (slow speed).
      const sample2 = makeSample({ latitude: 37.77491, longitude: -122.4194 });

      // Manually set accumulated time to 50 seconds and lastValidSampleAt to 10s ago.
      // Total: 50_000 + 10_000 = 60_000ms (well below 120s threshold).
      const candidate = service['candidates'].get('reminder-1');
      if (candidate) {
        candidate.lastValidSampleAt = new Date(Date.now() - 10_000);
        candidate.accumulatedStationaryTimeMs = 50_000; // 50 seconds, below threshold
      }

      expect(service.processLocationSample('reminder-1', sample2)).toBe(false);
    });

    it('skips samples that are too close together (< 1 second)', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      const sample1 = makeSample();
      expect(service.processLocationSample('reminder-1', sample1)).toBe(false);

      // Second sample — same timestamp (0 seconds apart).
      const sample2 = makeSample();

      // Manually set the candidate's lastValidSampleAt to now.
      const candidate = service['candidates'].get('reminder-1');
      if (candidate) {
        candidate.lastValidSampleAt = new Date();
      }

      expect(service.processLocationSample('reminder-1', sample2)).toBe(false);
    });
  });

  describe('getRemainingStationaryTimeMs', () => {
    it('returns null for unknown reminderId', () => {
      expect(service.getRemainingStationaryTimeMs('unknown')).toBeNull();
    });

    it('returns remaining time for active candidate', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      // Manually set accumulated time to 60 seconds (60s remaining out of 120s).
      const candidate = service['candidates'].get('reminder-1');
      if (candidate) {
        candidate.accumulatedStationaryTimeMs = 60_000;
      }

      const remaining = service.getRemainingStationaryTimeMs('reminder-1');
      expect(remaining).toBe(60_000); // 60 seconds remaining
    });

    it('returns 0 when stationary threshold is reached', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      const candidate = service['candidates'].get('reminder-1');
      if (candidate) {
        candidate.accumulatedStationaryTimeMs = 120_000; // 120 seconds (threshold)
      }

      const remaining = service.getRemainingStationaryTimeMs('reminder-1');
      expect(remaining).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('removes all candidates', () => {
      service.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);
      service.startArrivalCandidate('reminder-2', 34.0522, -118.2437, 200);
      service.clearAll();
      expect(service.listCandidates()).toHaveLength(0);
    });
  });

  describe('custom config', () => {
    it('uses custom stationary speed threshold', () => {
      const customService = new StationaryService({
        stationarySpeedThresholdMps: 1.5, // custom threshold (faster than default)
      });

      customService.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      // With higher threshold (1.5 m/s), more movement is tolerated as "stationary".
      const sample = makeSample({ latitude: 37.7749, longitude: -122.4194 });
      expect(customService.processLocationSample('reminder-1', sample)).toBe(false);
    });

    it('uses custom required stationary duration', () => {
      const customService = new StationaryService({
        requiredStationaryDurationSeconds: 30, // shorter than default (120s)
      });

      customService.startArrivalCandidate('reminder-1', 37.7749, -122.4194, 200);

      const sample1 = makeSample();
      expect(customService.processLocationSample('reminder-1', sample1)).toBe(false);

      // Second sample — close (slow speed), set accumulated to 30 seconds.
      const sample2 = makeSample({ latitude: 37.77491, longitude: -122.4194 });
      const candidate = customService['candidates'].get('reminder-1');
      if (candidate) {
        candidate.lastValidSampleAt = new Date(Date.now() - 30_000);
        candidate.accumulatedStationaryTimeMs = 30_000; // 30 seconds, meets custom threshold
      }

      expect(customService.processLocationSample('reminder-1', sample2)).toBe(true);
    });
  });
});
