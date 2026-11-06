/**
 * React hook for geofencing operations.
 *
 * Wraps the native module with React state management, event listening,
 * and lifecycle handling (cleanup on unmount).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import {
  registerGeofence as nativeRegister,
  unregisterGeofence as nativeUnregister,
  unregisterAllGeofences as nativeUnregisterAll,
  checkPermissions as nativeCheckPermissions,
  onGeofenceEvent,
  isGooglePlayServicesAvailable,
} from '@/native/GeofencingModule';
import type { RegisterGeofenceParams, GeofenceEvent, PermissionStatus } from '@/native/GeofencingModule';

export interface UseGeofencingReturn {
  /** Register a geofence. */
  register: (params: RegisterGeofenceParams) => Promise<void>;
  /** Unregister a geofence by requestId. */
  unregister: (requestId: string) => Promise<void>;
  /** Clear all registered geofences. */
  clearAll: () => Promise<void>;
  /** Check current permissions (can be called anytime). */
  checkPermissions: () => Promise<PermissionStatus>;
  /** Current permission status (null until first check). */
  permissionStatus: PermissionStatus | null;
  /** Currently registered requestIds. */
  registeredIds: string[];
  /** All geofence events received (most recent first). */
  events: GeofenceEvent[];
  /** Whether geofencing is supported (false on Android without GMS). */
  isSupported: boolean;
}

/** React hook for geofencing operations. */
export function useGeofencing(): UseGeofencingReturn {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [registeredIds, setRegisteredIds] = useState<string[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const subscriptionRef = useRef<(() => void) | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Check platform support on mount (Android without GMS)
  useEffect(() => {
    isGooglePlayServicesAvailable().then((available) => {
      setIsSupported(available);
    }).catch(() => {
      // Assume supported if check fails (iOS)
      setIsSupported(true);
    });
  }, []);

  // Subscribe to geofence events
  useEffect(() => {
    const unsubscribe = onGeofenceEvent((event: GeofenceEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
    });

    subscriptionRef.current = unsubscribe;

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
        subscriptionRef.current = null;
      }
    };
  }, []);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      const previousState = appStateRef.current;

      if (previousState === 'active' && nextAppState === 'background') {
        // App going to background — native layer handles monitoring
      } else if (previousState !== 'active' && nextAppState === 'active') {
        // App coming to foreground — refresh permission status
        nativeCheckPermissions().then(setPermissionStatus).catch(() => {});
      }

      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Register a geofence
  const register = useCallback(async (params: RegisterGeofenceParams): Promise<void> => {
    const result = await nativeRegister(params);

    if (result.success) {
      setRegisteredIds((prev) => [...prev, params.requestId]);
    } else {
      throw new Error(result.error || 'Failed to register geofence');
    }
  }, []);

  // Unregister a single geofence
  const unregister = useCallback(async (requestId: string): Promise<void> => {
    const result = await nativeUnregister(requestId);

    if (result.success) {
      setRegisteredIds((prev) => prev.filter((id) => id !== requestId));
    } else if (result.error) {
      throw new Error(result.error);
    }
  }, []);

  // Clear all geofences
  const clearAll = useCallback(async (): Promise<void> => {
    await nativeUnregisterAll();
    setRegisteredIds([]);
  }, []);

  // Check permissions (exposed for manual refresh)
  const checkPermissions = useCallback(async (): Promise<PermissionStatus> => {
    const status = await nativeCheckPermissions();
    setPermissionStatus(status);
    return status;
  }, []);

  return {
    register,
    unregister,
    clearAll,
    checkPermissions,
    permissionStatus,
    registeredIds,
    events,
    isSupported,
  };
}
