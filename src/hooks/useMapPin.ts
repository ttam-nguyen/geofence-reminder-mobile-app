/**
 * useMapPin hook.
 *
 * Handles map pin placement, repositioning, and radius visualization.
 */

import { useState, useCallback } from 'react';

export interface MapPinPosition {
  latitude: number;
  longitude: number;
}

export interface UseMapPinReturn {
  /** Current pin position (null if not placed) */
  pinPosition: MapPinPosition | null;
  /** Place or move the pin */
  setPinPosition: (pos: MapPinPosition) => void;
  /** Radius in meters for the geofence circle */
  radiusMeters: number;
  /** Set the radius */
  setRadiusMeters: (meters: number) => void;
  /** Reset pin and radius */
  reset: () => void;
}

export function useMapPin(): UseMapPinReturn {
  const [pinPosition, setPinPositionState] = useState<MapPinPosition | null>(null);
  const [radiusMeters, setRadiusMetersState] = useState(100);

  const setPinPosition = useCallback((pos: MapPinPosition) => {
    setPinPositionState(pos);
  }, []);

  const setRadiusMeters = useCallback((meters: number) => {
    // Clamp to spec range (10–500 meters for GPS, wider for map)
    const clamped = Math.max(10, Math.min(meters, 500));
    setRadiusMetersState(clamped);
  }, []);

  const reset = useCallback(() => {
    setPinPositionState(null);
    setRadiusMetersState(100);
  }, []);

  return { pinPosition, setPinPosition, radiusMeters, setRadiusMeters, reset };
}
