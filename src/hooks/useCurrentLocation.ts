/**
 * useCurrentLocation hook.
 *
 * Provides current GPS coordinates, accuracy, and loading/error states.
 */

import { useState, useEffect, useCallback } from 'react';
import type { LocationResult } from '../services/LocationService';
import { getCurrentPosition } from '../services/LocationService';

export interface UseCurrentLocationReturn {
  /** Current location (null while loading or if unavailable) */
  location: LocationResult | null;
  /** Loading state (true while fetching first position) */
  loading: boolean;
  /** Error message or null */
  error: string | null;
  /** Refresh current position */
  refresh: () => Promise<void>;
}

export function useCurrentLocation(): UseCurrentLocationReturn {
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCurrentPosition();
      setLocation(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Location unavailable';
      setError(message);
      setLocation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { location, loading, error, refresh };
}
