// Reverse geocoding utility — converts coordinates to a human-readable address string.
// Uses OpenStreetMap Nominatim (free, rate-limited). Failure does not block save.

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

/**
 * Forward geocoding — converts an address search query into coordinates.
 * Uses OpenStreetMap Nominatim (free, rate-limited). Failure does not block save.
 */
export async function forwardGeocode(
  query: string,
): Promise<{ latitude: number; longitude: number; displayName: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const first = data[0];
    const latitude = parseFloat(first.lat);
    const longitude = parseFloat(first.lon);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;

    return {
      latitude,
      longitude,
      displayName: first.display_name || query,
    };
  } catch {
    return null;
  }
}
