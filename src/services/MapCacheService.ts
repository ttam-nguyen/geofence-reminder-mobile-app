/**
 * Map Cache Service — offline tile caching.
 *
 * Manages downloading and checking cached map tiles for offline use.
 * Uses Mapbox offline packaging (or equivalent) when device is available.
 */

/** A cached map area with its bounds and metadata. */
export interface CachedArea {
  /** Unique identifier (e.g., "us-california-sanfrancisco") */
  regionId: string;
  /** Minimum latitude of the cached bounding box */
  minLat: number;
  /** Maximum latitude of the cached bounding box */
  maxLat: number;
  /** Minimum longitude of the cached bounding box */
  minLng: number;
  /** Maximum longitude of the cached bounding box */
  maxLng: number;
  /** Zoom levels that are cached */
  zoomLevels: number[];
  /** Epoch milliseconds when area was last downloaded */
  downloadedAt: number;
}

/** Status of a cache operation. */
export enum CacheStatus {
  OK = 'OK',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  IN_PROGRESS = 'IN_PROGRESS',
  FAILED = 'FAILED',
}

export class MapCacheService {
  private cachedAreas: CachedArea[] = [];

  /** Check if a specific tile is cached (by lat/lng/zoom). */
  async isTileCached(
    latitude: number,
    longitude: number,
    zoom: number,
  ): Promise<boolean> {
    const area = this.cachedAreas.find(
      (a) =>
        latitude >= a.minLat &&
        latitude <= a.maxLat &&
        longitude >= a.minLng &&
        longitude <= a.maxLng &&
        a.zoomLevels.includes(zoom),
    );
    return !!area;
  }

  /** Check if any zoom level of an area is cached. */
  async isAreaCached(
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    return this.cachedAreas.some(
      (a) =>
        latitude >= a.minLat &&
        latitude <= a.maxLat &&
        longitude >= a.minLng &&
        longitude <= a.maxLng,
    );
  }

  /** Download a map area for offline use. */
  async downloadArea(area: Omit<CachedArea, 'downloadedAt'>): Promise<CacheStatus> {
    // TODO: Replace with actual tile download (Mapbox offline package).

    /* Production code (uncomment when device ready):
    const existing = this.cachedAreas.find(
      (a) => a.regionId === area.regionId,
    );
    if (existing) return CacheStatus.ALREADY_EXISTS;

    // Start download...
    const offlinePack = await MapboxOffline.packRegion({
      bounds: { minLat: area.minLat, maxLat: area.maxLat, minLng: area.minLng, maxLng: area.maxLng },
      zoomLevels: area.zoomLevels,
    });

    await offlinePack.waitUntilFinished();

    this.cachedAreas.push({
      ...area,
      downloadedAt: Date.now(),
    });

    return CacheStatus.OK;
    */

    // Mock: simulate successful download
    const existing = this.cachedAreas.find((a) => a.regionId === area.regionId);
    if (existing) return CacheStatus.ALREADY_EXISTS;

    this.cachedAreas.push({
      ...area,
      downloadedAt: Date.now(),
    });

    return CacheStatus.OK;
  }

  /** Get all cached areas. */
  async getCachedAreas(): Promise<CachedArea[]> {
    // TODO: Replace with actual cache listing.

    /* Production code (uncomment when device ready):
    const offlinePacks = await MapboxOffline.listPacks();
    return offlinePacks.map((pack) => ({
      regionId: pack.name,
      minLat: pack.bounds.minLat,
      maxLat: pack.bounds.maxLat,
      minLng: pack.bounds.minLng,
      maxLng: pack.bounds.maxLng,
      zoomLevels: pack.zoomLevels,
      downloadedAt: pack.downloadedAt,
    }));
    */

    return [...this.cachedAreas];
  }

  /** Check if a lat/lng point is within any cached area. */
  async isPointInCachedArea(
    latitude: number,
    longitude: number,
  ): Promise<boolean> {
    return this.isAreaCached(latitude, longitude);
  }

  /** Remove a cached area. */
  async removeArea(regionId: string): Promise<void> {
    // TODO: Replace with actual cache removal.

    /* Production code (uncomment when device ready):
    await MapboxOffline.removePack(regionId);
    this.cachedAreas = this.cachedAreas.filter((a) => a.regionId !== regionId);
    */

    this.cachedAreas = this.cachedAreas.filter((a) => a.regionId !== regionId);
  }

  /** Get cached area info for a specific region. */
  async getAreaInfo(regionId: string): Promise<CachedArea | null> {
    return (await this.getCachedAreas()).find((a) => a.regionId === regionId) || null;
  }
}
