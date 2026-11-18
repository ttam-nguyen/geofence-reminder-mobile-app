/**
 * GeofencingModule — TypeScript interface for Android native geofencing.
 *
 * Wraps the Android Geofencing API (Task 8.3) for region monitoring and event emission.
 */

import { NativeModules } from 'react-native';

const { GeofencingModule } = NativeModules;

if (!GeofencingModule) {
  throw new Error('GeofencingModule native module not found. Check that it is registered correctly.');
}

/**
 * Transition type constants matching Android GeofenceTransitions.
 */
export const TRANSITION_ENTER = 1;   // Entered the geofence (200m boundary)
export const TRANSITION_EXIT = 2;    // Exited the geofence (triggered stationary qualification)
export const TRANSITION_DWELL = 4;   // User stayed inside geofence for sustained period (optional, supporting only)

/**
 * Register a geofence for the given reminder.
 * @param reminderId - Unique identifier for the reminder.
 * @param latitude - Center latitude of the geofence (200m radius).
 * @param longitude - Center longitude of the geofence (200m radius).
 * @param radius - Geofence radius (minimum 200m production radius).
 */
export async function registerGeofence(
  reminderId: string,
  latitude: number,
  longitude: number,
  radius: number = 200
): Promise<void> {
  return GeofencingModule.registerGeofence(reminderId, latitude, longitude, radius);
}

/**
 * Unregister a geofence for the given reminder.
 */
export async function unregisterGeofence(reminderId: string): Promise<void> {
  return GeofencingModule.unregisterGeofence(reminderId);
}

/**
 * List all registered geofences.
 */
export async function listRegisteredGeofences(): Promise<GeofenceInfo[]> {
  return GeofencingModule.listRegisteredGeofences();
}

/**
 * Get the current location permission status.
 */
export async function getAuthorizationStatus(): Promise<string> {
  return GeofencingModule.getAuthorizationStatus();
}

/**
 * Request location permission (Android).
 */
export async function requestLocationPermission(): Promise<void> {
  return GeofencingModule.requestLocationPermission();
}

/**
 * Information about a registered geofence.
 */
export interface GeofenceInfo {
  reminderId: string;
  latitude: number;
  longitude: number;
  radius: number;
}

/**
 * Type definition for the GeofencingModule native interface.
 */
export interface GeofencingModuleInterface {
  registerGeofence(reminderId: string, latitude: number, longitude: number, radius: number): Promise<void>;
  unregisterGeofence(reminderId: string): Promise<void>;
  listRegisteredGeofences(): Promise<GeofenceInfo[]>;
  getAuthorizationStatus(): Promise<string>;
  requestLocationPermission(): Promise<void>;
}

export default GeofencingModule;
