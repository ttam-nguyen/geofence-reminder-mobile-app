/**
 * Location Service — wraps react-native-geolocation-service.
 *
 * Provides one-shot current position and continuous watching for map use.
 */

import Geolocation from 'react-native-geolocation-service';
import type { GeoPosition, GeoError, AuthorizationResult } from 'react-native-geolocation-service';

/** Result from a location request. */
export interface LocationResult {
  /** Latitude (-90 to 90) */
  latitude: number;
  /** Longitude (-180 to 180) */
  longitude: number;
  /** Horizontal accuracy in meters */
  accuracy: number;
  /** Epoch milliseconds */
  timestamp: number;
  /** Altitude in meters (optional, iOS only) */
  altitude?: number;
  /** Heading in degrees (optional, Android only) */
  heading?: number;
  /** Speed in m/s (optional) */
  speed?: number;
}

/** Error codes from location requests. */
export enum LocationError {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  POSITION_UNAVAILABLE = 'POSITION_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/** Map the library's PositionError code to our LocationError. */
function mapError(error: GeoError): Error {
  switch (error.code) {
    case 1: // PERMISSION_DENIED
      return new Error(LocationError.PERMISSION_DENIED);
    case 2: // POSITION_UNAVAILABLE
      return new Error(LocationError.POSITION_UNAVAILABLE);
    case 3: // TIMEOUT
      return new Error(LocationError.TIMEOUT);
    default:
      return new Error(error.message || LocationError.UNKNOWN);
  }
}

/** Convert library GeoPosition to our LocationResult. */
function toLocationResult(pos: GeoPosition): LocationResult {
  const { coords, timestamp } = pos;
  const result: LocationResult = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    accuracy: coords.accuracy,
    timestamp,
  };
  if (coords.altitude != null) result.altitude = coords.altitude;
  if (coords.heading != null) result.heading = coords.heading;
  if (coords.speed != null) result.speed = coords.speed;
  return result;
}

/** Get current GPS position (one-shot). */
export function getCurrentPosition(): Promise<LocationResult> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos) => resolve(toLocationResult(pos)),
      (err) => reject(mapError(err)),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  });
}

/** Watch current position (continuous updates for map). */
export function watchPosition(
  callback: (result: LocationResult) => void,
  onError?: (error: Error) => void,
): { unsubscribe: () => void } {
  const watchId = Geolocation.watchPosition(
    (pos) => callback(toLocationResult(pos)),
    (err) => onError?.(mapError(err)),
    {
      enableHighAccuracy: true,
      distanceFilter: 0,
    },
  );
  return {
    unsubscribe: () => Geolocation.clearWatch(watchId),
  };
}

/** Check location permission status via the native runtime. */
export async function checkLocationPermission(): Promise<'granted' | 'denied' | 'never_asked'> {
  const result: AuthorizationResult = await Geolocation.requestAuthorization('whenInUse');
  switch (result) {
    case 'granted':
      return 'granted';
    case 'denied':
      return 'denied';
    case 'restricted':
      return 'denied';
    case 'disabled':
      return 'never_asked';
  }
}
