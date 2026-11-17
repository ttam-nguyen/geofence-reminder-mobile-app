// Location permission hook — encapsulates the permission request flow
// and returns the current permission state.

import { useState, useEffect, useCallback } from 'react';
import Geolocation from 'react-native-geolocation-service';
import type { AuthorizationResult, AuthorizationLevel } from 'react-native-geolocation-service';
import { Platform, Linking } from 'react-native';

export type PermissionStatus = 'granted' | 'denied' | 'restricted' | 'unavailable';

function mapResult(result: AuthorizationResult): PermissionStatus {
  if (result === 'granted') return 'granted';
  if (result === 'denied') return 'denied';
  if (result === 'restricted') return 'restricted';
  return 'unavailable'; // 'disabled' maps to unavailable
}

export function useLocationPermission() {
  const [status, setStatus] = useState<PermissionStatus>('unavailable');
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const level: AuthorizationLevel = Platform.OS === 'ios' ? 'whenInUse' : 'always';
        const result = await Geolocation.requestAuthorization(level);
        if (!cancelled) {
          setStatus(mapResult(result));
        }
      } catch {
        if (!cancelled) {
          setStatus('unavailable');
        }
      }
    }

    check();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    if (hasRequested) return;
    setHasRequested(true);

    try {
      const level: AuthorizationLevel = Platform.OS === 'ios' ? 'whenInUse' : 'always';
      const result = await Geolocation.requestAuthorization(level);
      setStatus(mapResult(result));
    } catch {
      setStatus('unavailable');
    }
  }, [hasRequested]);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { status, requestPermission, openSettings };
}
