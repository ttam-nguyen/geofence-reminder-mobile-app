/**
 * Unit tests for MapCacheService.
 *
 * Tests cached area management, tile checks, and download status.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MapCacheService, CacheStatus } from '@/services/MapCacheService';

describe('MapCacheService', () => {
  let service: MapCacheService;

  beforeEach(() => {
    service = new MapCacheService();
  });

  describe('isTileCached', () => {
    it('returns false when no tiles cached (mock)', async () => {
      const result = await service.isTileCached(37.7749, -122.4194, 15);
      expect(result).toBe(false);
    });

    it('returns true for cached area after download', async () => {
      await service.downloadArea({
        regionId: 'test-area',
        minLat: 37.0,
        maxLat: 38.0,
        minLng: -123.0,
        maxLng: -122.0,
        zoomLevels: [10, 14, 15, 16],
      });

      const result = await service.isTileCached(37.5, -122.5, 15);
      expect(result).toBe(true);
    });

    it('returns false for uncached zoom level', async () => {
      await service.downloadArea({
        regionId: 'test-area2',
        minLat: 37.0,
        maxLat: 38.0,
        minLng: -123.0,
        maxLng: -122.0,
        zoomLevels: [10, 14],
      });

      const result = await service.isTileCached(37.5, -122.5, 16);
      expect(result).toBe(false);
    });
  });

  describe('isAreaCached', () => {
    it('returns false when no areas cached', async () => {
      const result = await service.isAreaCached(37.7749, -122.4194);
      expect(result).toBe(false);
    });

    it('returns true for point inside cached area', async () => {
      await service.downloadArea({
        regionId: 'sf-area',
        minLat: 37.0,
        maxLat: 38.0,
        minLng: -123.0,
        maxLng: -122.0,
        zoomLevels: [10],
      });

      const result = await service.isAreaCached(37.5, -122.5);
      expect(result).toBe(true);
    });

    it('returns false for point outside cached area', async () => {
      await service.downloadArea({
        regionId: 'sf-area',
        minLat: 37.0,
        maxLat: 38.0,
        minLng: -123.0,
        maxLng: -122.0,
        zoomLevels: [10],
      });

      const result = await service.isAreaCached(40.0, -120.0);
      expect(result).toBe(false);
    });
  });

  describe('downloadArea', () => {
    it('downloads a new area successfully', async () => {
      const result = await service.downloadArea({
        regionId: 'new-area',
        minLat: 34.0,
        maxLat: 35.0,
        minLng: -120.0,
        maxLng: -119.0,
        zoomLevels: [12, 13, 14],
      });

      expect(result).toBe(CacheStatus.OK);
    });

    it('returns ALREADY_EXISTS for duplicate region', async () => {
      await service.downloadArea({
        regionId: 'dup-area',
        minLat: 34.0,
        maxLat: 35.0,
        minLng: -120.0,
        maxLng: -119.0,
        zoomLevels: [12],
      });

      const result = await service.downloadArea({
        regionId: 'dup-area',
        minLat: 34.0,
        maxLat: 35.0,
        minLng: -120.0,
        maxLng: -119.0,
        zoomLevels: [12],
      });

      expect(result).toBe(CacheStatus.ALREADY_EXISTS);
    });

    it('tracks downloadedAt timestamp', async () => {
      await service.downloadArea({
        regionId: 'timed-area',
        minLat: 34.0,
        maxLat: 35.0,
        minLng: -120.0,
        maxLng: -119.0,
        zoomLevels: [12],
      });

      const areas = await service.getCachedAreas();
      expect(areas).toHaveLength(1);
      expect(typeof areas[0].downloadedAt).toBe('number');
    });
  });

  describe('getCachedAreas', () => {
    it('returns empty array when no areas cached', async () => {
      const areas = await service.getCachedAreas();
      expect(areas).toEqual([]);
    });

    it('returns all cached areas', async () => {
      await service.downloadArea({ regionId: 'a1', minLat: 0, maxLat: 1, minLng: 0, maxLng: 1, zoomLevels: [10] });
      await service.downloadArea({ regionId: 'a2', minLat: 2, maxLat: 3, minLng: 2, maxLng: 3, zoomLevels: [10] });

      const areas = await service.getCachedAreas();
      expect(areas).toHaveLength(2);
    });
  });

  describe('removeArea', () => {
    it('removes a cached area', async () => {
      await service.downloadArea({ regionId: 'remove-me', minLat: 0, maxLat: 1, minLng: 0, maxLng: 1, zoomLevels: [10] });

      await service.removeArea('remove-me');

      const areas = await service.getCachedAreas();
      expect(areas).toHaveLength(0);
    });

    it('removing non-existent area is a no-op', async () => {
      await service.removeArea('non-existent');

      const areas = await service.getCachedAreas();
      expect(areas).toHaveLength(0);
    });
  });

  describe('getAreaInfo', () => {
    it('returns null for uncached area', async () => {
      const info = await service.getAreaInfo('uncached');
      expect(info).toBeNull();
    });

    it('returns info for cached area', async () => {
      await service.downloadArea({ regionId: 'info-area', minLat: 0, maxLat: 1, minLng: 0, maxLng: 1, zoomLevels: [10] });

      const info = await service.getAreaInfo('info-area');
      expect(info).not.toBeNull();
      expect(info!.regionId).toBe('info-area');
    });
  });
});
