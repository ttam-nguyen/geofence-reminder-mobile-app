import { haversineDistance } from '../haversine';

describe('haversineDistance', () => {
  it('returns approximately 0 for identical coordinates', () => {
    const distance = haversineDistance(0, 0, 0, 0);
    expect(distance).toBeLessThan(1); // floating point near-zero
  });

  it('calculates distance between New York and Los Angeles (~3944 km)', () => {
    const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    // Allow 5% tolerance for floating point
    expect(distance).toBeGreaterThan(3700000);
    expect(distance).toBeLessThan(4200000);
  });

  it('calculates distance between London and Paris (~343 km)', () => {
    const distance = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distance).toBeGreaterThan(300000);
    expect(distance).toBeLessThan(400000);
  });

  it('calculates distance between equator and north pole (~10007 km)', () => {
    const distance = haversineDistance(0, 0, 90, 0);
    // ~10001 km along a meridian; haversine gives ~10002 km
    expect(distance).toBeGreaterThan(9900000);
    expect(distance).toBeLessThan(10200000);
  });

  it('is symmetric (A→B = B→A)', () => {
    const d1 = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    const d2 = haversineDistance(34.0522, -118.2437, 40.7128, -74.006);
    expect(d1).toBeCloseTo(d2, 0);
  });

  it('returns meters (not km or miles)', () => {
    const distance = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    expect(distance).toBeGreaterThan(300000); // 343 km = 343000 m
  });

  it('handles same latitude, different longitudes', () => {
    const distance = haversineDistance(51.5074, -0.1278, 51.5074, 0.1278);
    expect(distance).toBeGreaterThan(10000); // ~16 km
    expect(distance).toBeLessThan(20000);
  });

  it('handles same longitude, different latitudes', () => {
    const distance = haversineDistance(51.5074, 0, 52.5074, 0);
    expect(distance).toBeGreaterThan(100000); // ~111 km
    expect(distance).toBeLessThan(120000);
  });

  it('handles coordinates near the antimeridian', () => {
    // Auckland to Wellington (same-side crossing, ~494 km)
    const distance = haversineDistance(-36.8485, 174.7633, -41.2891, 174.7870);
    expect(distance).toBeGreaterThan(450000);
    expect(distance).toBeLessThan(550000);
  });

  it('returns 0 for same point with non-zero coordinates', () => {
    const distance = haversineDistance(48.8566, 2.3522, 48.8566, 2.3522);
    expect(distance).toBeLessThan(1);
  });
});
