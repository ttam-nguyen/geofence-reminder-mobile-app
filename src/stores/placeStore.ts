/**
 * PlaceStore — saved and recent locations for the reminder form.
 *
 * One record shape serves both features:
 * - `saved: true`  → a favourite the user starred.
 * - `saved: false` → a recent search result, kept automatically.
 *
 * The same list, dedupe rule and UI serve history and favourites, so a place can be promoted from
 * history to a favourite with one tap instead of living in two tables.
 *
 * Storage: AsyncStorage as JSON. Volume is small (a few dozen places), reads are one key, and it
 * needs no schema migration — unlike the reminder table, which carries user data worth a migration.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'geofence.places.v1';

/** Recent entries kept beyond the saved ones. */
export const MAX_RECENT_PLACES = 8;
/** Hard cap so the key cannot grow without bound. */
const MAX_PLACES = 40;
/** Two coordinates closer than this are treated as the same place. */
const SAME_PLACE_METERS = 30;

export interface SavedPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  /** Favourite flag. Recent history entries keep `false`. */
  saved: boolean;
  createdAt: string;
  lastUsedAt: string;
}

export interface PlaceInput {
  name: string;
  latitude: number;
  longitude: number;
}

let cache: SavedPlace[] | null = null;

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radius = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isPlace(value: unknown): value is SavedPlace {
  if (typeof value !== 'object' || value === null) return false;
  const place = value as Partial<SavedPlace>;
  return (
    typeof place.id === 'string' &&
    typeof place.name === 'string' &&
    typeof place.latitude === 'number' &&
    typeof place.longitude === 'number' &&
    typeof place.saved === 'boolean'
  );
}

async function read(): Promise<SavedPlace[]> {
  if (cache) {
    return cache;
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter(isPlace) : [];
  } catch {
    cache = [];
  }

  return cache;
}

async function write(places: SavedPlace[]): Promise<void> {
  cache = places;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(places));
  } catch {
    // Storage failure must never block saving a reminder; the in-memory list still works.
  }
}

/** Saved favourites first, then recents by most recently used. */
export function sortPlaces(places: SavedPlace[]): SavedPlace[] {
  return [...places].sort((a, b) => {
    if (a.saved !== b.saved) {
      return a.saved ? -1 : 1;
    }
    return b.lastUsedAt.localeCompare(a.lastUsedAt);
  });
}

/** Every place, favourites first. */
export async function listPlaces(): Promise<SavedPlace[]> {
  return sortPlaces(await read());
}

/** Only the starred places. */
export async function listSavedPlaces(): Promise<SavedPlace[]> {
  return sortPlaces((await read()).filter(place => place.saved));
}

/**
 * Record a place the user just used (a picked search result, a dropped pin or the current
 * location). Matching by proximity keeps one entry per physical place, and keeps its star.
 */
export async function rememberPlace(input: PlaceInput): Promise<SavedPlace[]> {
  const places = await read();
  const now = new Date().toISOString();

  const existing = places.find(
    place =>
      haversineMeters(place.latitude, place.longitude, input.latitude, input.longitude) <=
      SAME_PLACE_METERS,
  );

  let next: SavedPlace[];
  if (existing) {
    next = places.map(place =>
      place.id === existing.id
        ? {
            ...place,
            // A later, more specific name wins (a search result over a reverse-geocoded label).
            name: input.name || place.name,
            latitude: input.latitude,
            longitude: input.longitude,
            lastUsedAt: now,
          }
        : place,
    );
  } else {
    next = [
      {
        id: `place-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: input.name,
        latitude: input.latitude,
        longitude: input.longitude,
        saved: false,
        createdAt: now,
        lastUsedAt: now,
      },
      ...places,
    ];
  }

  // Trim recents only; favourites are never dropped by the cap.
  const favourites = next.filter(place => place.saved);
  const recents = next.filter(place => !place.saved).slice(0, MAX_RECENT_PLACES);
  await write(sortPlaces([...favourites, ...recents]).slice(0, MAX_PLACES));

  return listPlaces();
}

/** Star or unstar a place. Unknown ids are ignored. */
export async function setPlaceSaved(placeId: string, saved: boolean): Promise<SavedPlace[]> {
  const places = await read();
  await write(places.map(place => (place.id === placeId ? { ...place, saved } : place)));
  return listPlaces();
}

/** Remove one place entirely. */
export async function removePlace(placeId: string): Promise<SavedPlace[]> {
  const places = await read();
  await write(places.filter(place => place.id !== placeId));
  return listPlaces();
}

/** Drop every unsaved entry (clear history), keeping favourites. */
export async function clearHistory(): Promise<SavedPlace[]> {
  const places = await read();
  await write(places.filter(place => place.saved));
  return listPlaces();
}

/** Test/reset hook. */
export async function resetPlacesForTests(): Promise<void> {
  cache = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Prime the cache shortly after import so the first render of the form has suggestions ready.
void read();
