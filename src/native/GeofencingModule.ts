/**
 * TypeScript interfaces for the native geofencing module.
 *
 * Defines the contract between JS and native code (iOS Core Location + Android Geofencing API).
 */

import { NativeEventEmitter, NativeModules } from 'react-native';

const { GeofencingModule } = NativeModules;

if (!GeofencingModule) {
  throw new Error('GeofencingModule is not registered. Check your native module setup.');
}

/** Parameters for registering a single geofence. */
export interface RegisterGeofenceParams {
  /** Maps to Reminder.id */
  requestId: string;
  /** Center latitude (-90 to 90) */
  latitude: number;
  /** Center longitude (-180 to 180) */
  longitude: number;
  /** Radius in meters (10–500) */
  radiusMeters: number;
  /** Fire on entry (always true for MVP) */
  notifyOnEntry: boolean;
  /** Fire on exit (iOS supports, Android fires but we ignore) */
  notifyOnExit?: boolean;
}

/** Event emitted when a geofence boundary is crossed. */
export interface GeofenceEvent {
  /** Maps to Reminder.id */
  requestId: string;
  /** ENTER or EXIT */
  eventType: 'ENTER' | 'EXIT';
  /** Epoch milliseconds */
  timestamp: number;
  /** Event latitude */
  latitude: number;
  /** Event longitude */
  longitude: number;
  /** Horizontal accuracy in meters */
  horizontalAccuracy: number;
}

/** Permission status returned by checkPermissions(). */
export interface PermissionStatus {
  /** Location permission state */
  locationPermission: 'granted' | 'denied' | 'never_asked' | 'restricted';
  /** Notification permission state */
  notificationPermission: 'granted' | 'denied' | 'never_asked';
  /** iOS only: true if "Always" authorization granted */
  backgroundLocationAllowed: boolean;
}

// --- Native module type definition ---

interface NativeGeofencingModule {
  /** Register a single geofence. Returns success/error. */
  registerGeofence: (params: RegisterGeofenceParams) => Promise<{ success: boolean; error?: string }>;
  /** Unregister a geofence by requestId. Returns success/error. */
  unregisterGeofence: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  /** Remove all registered geofences. */
  unregisterAllGeofences: () => Promise<{ success: boolean }>;
  /** Check current permission states. */
  checkPermissions: () => Promise<PermissionStatus>;
  /** Request location permission (foreground). Returns status. */
  requestLocationPermission: () => Promise<'granted' | 'denied' | 'never_asked'>;
  /** Request background location permission (iOS "Always"). Returns success. */
  requestBackgroundPermission: () => Promise<boolean>;
  /** Check if Google Play Services is available (Android only). */
  isGooglePlayServicesAvailable: () => Promise<boolean>;
}

// Cast the native module to our typed interface
const typedModule = GeofencingModule as NativeGeofencingModule;

// Create event emitter for geofence boundary-crossing events
const nativeEmitter = new NativeEventEmitter(GeofencingModule);

/** Subscribes to geofence events. Returns unsubscribe function. */
export function onGeofenceEvent(
  listener: (event: GeofenceEvent) => void,
): () => void {
  const subscription = nativeEmitter.addListener('GeofenceEvent', (data: GeofenceEvent) => {
    listener(data);
  });

  return () => {
    subscription.remove();
  };
}

// --- Exported API (used by JS code) ---

/** Register a single geofence. */
export async function registerGeofence(
  params: RegisterGeofenceParams,
): Promise<{ success: boolean; error?: string }> {
  return typedModule.registerGeofence(params);
}

/** Unregister a single geofence by requestId. */
export async function unregisterGeofence(
  requestId: string,
): Promise<{ success: boolean; error?: string }> {
  return typedModule.unregisterGeofence(requestId);
}

/** Remove all registered geofences. */
export async function unregisterAllGeofences(): Promise<{ success: boolean }> {
  return typedModule.unregisterAllGeofences();
}

/** Check current permission states. */
export async function checkPermissions(): Promise<PermissionStatus> {
  return typedModule.checkPermissions();
}

/** Request location permission (foreground). */
export async function requestLocationPermission(): Promise<'granted' | 'denied' | 'never_asked'> {
  return typedModule.requestLocationPermission();
}

/** Request background location permission (iOS "Always"). */
export async function requestBackgroundPermission(): Promise<boolean> {
  return typedModule.requestBackgroundPermission();
}

/** Check if Google Play Services is available (Android only). */
export async function isGooglePlayServicesAvailable(): Promise<boolean> {
  return typedModule.isGooglePlayServicesAvailable();
}

export { typedModule as GeofencingModule };
