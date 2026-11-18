/**
 * LocationSample — a validated location reading from the device.
 * Used for stationary qualification during arrival detection.
 */

export interface LocationSample {
  latitude: number;
  longitude: number;
  timestamp: string; // ISO 8601
  horizontalAccuracy?: number | null; // meters (from CLLocation.horizontalAccuracy or LocationResult.accuracy)
}
