/**
 * Location Service — wraps React Native Geolocation API.
 *
 * Provides one-shot current position and continuous watching for map use.
 */

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

/** Get current GPS position (one-shot). */
export async function getCurrentPosition(): Promise<LocationResult> {
  // TODO: Replace with react-native-geolocation-service when device available.
  return {
    latitude: 37.7749,
    longitude: -122.4194,
    accuracy: 10,
    timestamp: Date.now(),
  };
}

/** Watch current position (continuous updates for map). */
export function watchPosition(
  _callback: (result: LocationResult) => void,
  _onError?: (error: Error) => void,
): { unsubscribe: () => void } {
  // TODO: Replace with Geolocation.watchPosition when device available.
  return { unsubscribe: () => {} };
}

/** Check if location permission is likely granted (stub). */
export async function checkLocationPermission(): Promise<'granted' | 'denied' | 'never_asked'> {
  return 'granted';
}
