// Map cache hook — persists the last selected map region to AsyncStorage.

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Region } from 'react-native-maps';

const LAST_REGION_KEY = 'lastMapRegion';

export function useMapCache() {
  const [lastRegion, setLastRegion] = useState<Region | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const cached = await AsyncStorage.getItem(LAST_REGION_KEY);
        if (cached) {
          setLastRegion(JSON.parse(cached));
        }
      } catch {
        // Ignore parse/storage errors — start fresh.
      }
    };
    load();
  }, []);

  const saveRegion = (region: Region) => {
    setLastRegion(region);
    AsyncStorage.setItem(LAST_REGION_KEY, JSON.stringify(region)).catch(() => {
      // Ignore storage errors.
    });
  };

  return { lastRegion, saveRegion };
}
