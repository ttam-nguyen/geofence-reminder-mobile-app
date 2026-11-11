/**
 * Search Service — real place search via geocoding API.
 *
 * Primary: Mapbox Geocoding API (requires MAPBOX_TOKEN env var).
 * Fallback: Nominatim (OpenStreetMap) — free, 1 req/sec rate limit.
 * Clearly reports unavailability when offline.
 */

import NetInfo from '@react-native-community/netinfo';

/** A place returned by search. */
export interface SearchPlace {
  /** Unique identifier for the place */
  id: string;
  /** Display name (e.g., "Golden Gate Bridge") */
  name: string;
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Full address string (optional) */
  address?: string;
}

/** Error thrown when offline. */
export class OfflineError extends Error {
  constructor(message = 'Location search requires internet connection') {
    super(message);
    this.name = 'OfflineError';
  }
}

/** Error thrown when geocoding API is unavailable. */
export class GeocodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GeocodeError';
  }
}

/* ------------------------------------------------------------------ */
/*  Online check — uses @react-native-community/netinfo              */
/* ------------------------------------------------------------------ */

/** Check if device has internet connectivity. */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && (state.isInternetReachable ?? true));
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Mapbox geocoding (primary)                                        */
/* ------------------------------------------------------------------ */

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

/** Search places via Mapbox Geocoding API. */
async function searchPlacesMapbox(
  query: string,
  minLat?: number,
  maxLat?: number,
  minLng?: number,
  maxLng?: number,
): Promise<SearchPlace[]> {
  if (!MAPBOX_TOKEN) return [];

  const params = new URLSearchParams({
    access_token: MAPBOX_TOKEN,
    limit: '10',
  });

  // Bounding box: mapbox uses minLon,maxLat,minLat,maxLng
  if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
    params.set('bbox', `${minLng},${maxLat},${maxLng},${minLat}`);
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;

  const response = await fetch(url);

  if (!response.ok) {
    // Don't throw — Mapbox is unavailable (no token / quota), fall through to Nominatim
    return [];
  }

  const data = await response.json();

  return (data.features || []).map((feature: any) => ({
    id: feature.id,
    name: feature.place_name,
    latitude: feature.center[1],
    longitude: feature.center[0],
    address: feature.address,
  }));
}

/* ------------------------------------------------------------------ */
/*  Nominatim (OpenStreetMap) fallback — 1 req/sec rate limit         */
/* ------------------------------------------------------------------ */

/** Simple delay helper for Nominatim 1 req/sec rate limit. */
let lastNominatimCall = 0;

async function delayIfNeeded(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNominatimCall;
  if (elapsed < 1000) {
    await new Promise((r) => setTimeout(r, 1000 - elapsed));
  }
  lastNominatimCall = Date.now();
}

/** Search places via Nominatim (OpenStreetMap). */
async function searchPlacesNominatim(
  query: string,
  minLat?: number,
  maxLat?: number,
  minLng?: number,
  maxLng?: number,
): Promise<SearchPlace[]> {
  await delayIfNeeded();

  const params = new URLSearchParams({
    format: 'json',
    q: query,
    limit: '10',
  });

  // Bounding box: nominatim uses minLon,maxLat,minLng,maxLat
  if (minLat != null && maxLat != null && minLng != null && maxLng != null) {
    params.set('bounded', '1');
    params.set('viewbox', `${minLng},${maxLat},${maxLng},${minLat}`);
  }

  const url = `https://nominatim.openstreetmap.org/search?${params}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'GPSReminder/1.0' },
  });

  if (!response.ok) {
    return []; // Nominatim unavailable, return empty (not an error — it's a free service)
  }

  const data = await response.json();

  return (data as any[]).map((item: any) => ({
    id: item.place_id,
    name: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    address: item.display_name,
  }));
}

/* ------------------------------------------------------------------ */
/*  Public API                                                        */
/* ------------------------------------------------------------------ */

/** Search for places by query string. Tries Mapbox first, falls back to Nominatim. */
export async function searchPlaces(query: string): Promise<SearchPlace[]> {
  const online = await isOnline();
  if (!online) {
    throw new OfflineError();
  }

  const mapboxResults = await searchPlacesMapbox(query);
  if (mapboxResults.length > 0) {
    return mapboxResults;
  }

  // Fallback to Nominatim (free, rate-limited)
  return searchPlacesNominatim(query);
}

/** Search places with a bounding box. Tries Mapbox first, falls back to Nominatim. */
export async function searchPlacesInArea(
  query: string,
  minLat?: number,
  maxLat?: number,
  minLng?: number,
  maxLng?: number,
): Promise<SearchPlace[]> {
  const online = await isOnline();
  if (!online) {
    throw new OfflineError();
  }

  const mapboxResults = await searchPlacesMapbox(query, minLat, maxLat, minLng, maxLng);
  if (mapboxResults.length > 0) {
    return mapboxResults;
  }

  // Fallback to Nominatim (free, rate-limited)
  return searchPlacesNominatim(query, minLat, maxLat, minLng, maxLng);
}
