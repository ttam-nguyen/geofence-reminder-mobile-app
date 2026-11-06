/**
 * Search Service — address/place search (online only).
 *
 * Calls a geocoding API (Mapbox placeholder for MVP) to resolve
 * text queries into place results. Clearly reports unavailability
 * when offline.
 */

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

/** Check if device appears to have internet. */
export function isOnline(): boolean {
  // TODO: Replace with NetInfo.isConnected.fetch() when device available.
  return true;
}

/** Search for places by query string. */
export async function searchPlaces(query: string): Promise<SearchPlace[]> {
  if (!isOnline()) {
    throw new OfflineError();
  }

  // TODO: Replace with actual geocoding API call (Mapbox, etc.).
  // For now, return mock results for testing.

  /* Production code (uncomment when device ready):
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}`,
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.status}`);
  }

  const data = await response.json();

  return (data.features || []).map((feature: any) => ({
    id: feature.id,
    name: feature.place_name,
    latitude: feature.center[1],
    longitude: feature.center[0],
    address: feature.address,
  }));
  */

  // Mock results for testing — replace with real API on device
  return [
    {
      id: 'mock-1',
      name: `Mock Place for "${query}"`,
      latitude: 37.7749,
      longitude: -122.4194,
      address: '123 Mock Street, San Francisco, CA',
    },
  ];
}

/** Search places with a bounding box (optional). */
export async function searchPlacesInArea(
  _query: string,
  _minLat?: number,
  _maxLat?: number,
  _minLng?: number,
  _maxLng?: number,
): Promise<SearchPlace[]> {
  if (!isOnline()) {
    throw new OfflineError();
  }

  // TODO: Replace with geocoding API that supports bounding boxes.
  return searchPlaces(_query);
}
