# Plan 5: Location Selection & Maps

## Feature Name
Location Selection — Current GPS, Map Pin, Address Search, Offline Maps

## Goal
Implement three location selection methods (current GPS, map pin placement, address/place search) that all produce the same canonical target-location model. Support offline map viewing with cached tiles.

## Architecture
- Current GPS: `Geolocation.watchPosition()` or one-shot `getCurrentPosition()` — wrapped in hook
- Map: `react-native-maps` with Mapbox source (offline tile caching)
- Search: live geocoding API (online only), offline state clearly communicated
- Offline indicator: cached map data status, search unavailable when offline

## Tech Stack
| Layer | Choice |
|---|---|
| Current GPS | `react-native-geolocation-service` (wrapper around native Geolocation) |
| Map | `react-native-maps` v1.x with Mapbox source (`react-native-maps-directions` optional) |
| Search | Custom geocoding API (Mapbox Geocoding API) or placeholder for MVP |
| Offline caching | Mapbox offline package (tiles stored to disk) |
| Network | `fetch` API (React Native built-in), offline detection via `NetInfo` |

## Spec References
- §3.2 Location selection: current GPS, map pin, address/business search
- §3.2 Current GPS: fresh location with accuracy + timestamp, explain poor/unavailable accuracy
- §3.2 Map pin: interactive map, place/reposition pin, show radius, save coordinates
- §3.2 Search: live search when online, clear offline unavailability message
- §4 Offline-first: map caching respects provider licensing, offline search not required for MVP

## Global Constraints
- All three methods produce identical canonical `TargetLocation` model: `{ latitude, longitude, accuracy?, locationName? }`
- Map must show current location (if permission granted), saved reminders, radius circle
- Offline: previously cached tiles render, search clearly reports unavailable
- No live search when offline — no ambiguity
- Map provider: Mapbox (MVP), proxy architecture designed for future migration

## Review Focus
- Current GPS returns valid coordinates with accuracy and timestamp
- Map shows current location, allows pin placement, displays radius circle
- Address search returns results when online, clear message when offline
- Cached tiles render correctly when offline (no network)
- All three methods produce same `TargetLocation` model

## Files to Create

```
src/models/
  TargetLocation.ts          — Canonical target location model (used by all 3 methods)

src/services/
  LocationService.ts         — Current GPS: getCurrentPosition, watchPosition

src/services/
  SearchService.ts           — Address/place search (online only)

src/services/
  MapCacheService.ts         — Offline tile caching: download, check availability, list cached areas

src/hooks/
  useCurrentLocation.ts      — Hook: current GPS coordinates + accuracy
  useMapPin.ts               — Hook: map pin placement, repositioning

src/ui/
  MapView.tsx                — Interactive map: current location, pins, radius circle, cached indicator
  CreateReminderLocationPicker.tsx — Screen: switch between GPS/map/search methods

src/__tests__/
  services/
    LocationService.test.ts  — getCurrentPosition returns coordinates + accuracy
    SearchService.test.ts    — Online: returns results, offline: error message
    MapCacheService.test.ts  — Cached tiles check, download status

```

## Interfaces

### Canonical Model (`src/models/TargetLocation.ts`)

```typescript
export interface TargetLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters (from GPS)
  locationName?: string; // from geocoding or manual entry
  source: LocationSource; // current_gps | map_pin | place_search
  timestamp: number; // epoch ms
}

export function createTargetLocation(overrides: Partial<TargetLocation>): TargetLocation;
```

### Location Service (`src/services/LocationService.ts`)

```typescript
export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number; // meters horizontal accuracy
  timestamp: number; // epoch ms
  altitude?: number;
  heading?: number;
  speed?: number;
}

export function getCurrentLocation(): Promise<LocationResult>;
export function watchLocation(callback: (result: LocationResult) => void): () => void; // returns unsubscribe
```

### Search Service (`src/services/SearchService.ts`)

```typescript
export interface SearchPlace {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export async function searchPlaces(query: string): Promise<SearchPlace[]>;
// Returns error when offline: throws Error with message "Location search requires internet connection"

export function isOnline(): boolean; // from NetInfo
```

### Map Cache Service (`src/services/MapCacheService.ts`)

```typescript
export interface CachedArea {
  regionId: string; // e.g., "us-california-sanfrancisco"
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
  zoomLevels: number[]; // cached zoom levels
  downloadedAt: number; // epoch ms
}

export class MapCacheService {
  isTileCached(latitude: number, longitude: number, zoom: number): Promise<boolean>;
  downloadArea(area: Omit<CachedArea, 'downloadedAt'>): Promise<void>;
  getCachedAreas(): Promise<CachedArea[]>;
  isAreaCached(latitude: number, longitude: number): Promise<boolean>; // any zoom level
}
```

### Hooks (`src/hooks/`)

```typescript
// useCurrentLocation.ts
interface UseCurrentLocationReturn {
  location: LocationResult | null;
  loading: boolean;
  error: string | null; // "Location permission denied", "Location unavailable"
  refresh: () => Promise<void>;
}
export function useCurrentLocation(): UseCurrentLocationReturn;

// useMapPin.ts
interface UseMapPinReturn {
  pinPosition: { latitude: number; longitude: number } | null;
  setPinPosition: (pos: { latitude: number; longitude: number }) => void;
  radiusMeters: number;
  setRadiusMeters: (meters: number) => void;
}
export function useMapPin(): UseMapPinReturn;
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 5.1:** Define `TargetLocation` canonical model
  - Create `src/models/TargetLocation.ts` — same shape for all 3 methods
  - Test: factory function creates valid model, validates lat/lng ranges
  - Expected: Model compiles, validation works

- [ ] **Step 5.2:** Implement current GPS service
  - Create `src/services/LocationService.ts` — wraps `react-native-geolocation-service`
  - Implement `getCurrentPosition()` (one-shot) and `watchPosition()` (continuous, for map)
  - Test: returns coordinates with accuracy and timestamp; handles permission denied and unavailable
  - Expected: GPS service returns valid data on real device

- [ ] **Step 5.3:** Implement map view component
  - Create `src/ui/MapView.tsx` — renders map with:
    - Current location dot (if permission granted)
    - Reminder pins (from repository)
    - Radius circle (when creating/editing reminder)
    - Cached map indicator (bottom-left corner)
  - Test: renders map component, shows current location dot when available
  - Expected: Map displays correctly on both platforms

- [ ] **Step 5.4:** Implement map pin placement hook
  - Create `src/hooks/useMapPin.ts` — handles map tap to place pin, drag to reposition
  - Test: placing pin updates position, radius circle updates
  - Expected: Pin placement works, radius circle follows pin

- [ ] **Step 5.5:** Implement address/place search service
  - Create `src/services/SearchService.ts` — calls Mapbox Geocoding API (or placeholder)
  - Offline: returns error "Location search requires internet connection"
  - Test: online → returns places; offline → throws error with clear message
  - Expected: Search works when online, clear error when offline

- [ ] **Step 5.6:** Implement map cache service
  - Create `src/services/MapCacheService.ts` — checks/downloads cached tiles (Mapbox offline)
  - Test: `isAreaCached()` returns correct boolean, `downloadArea()` stores tiles to disk
  - Expected: Cached tiles available offline, download status tracked

- [ ] **Step 5.7:** Implement location picker screen
  - Create `src/ui/CreateReminderLocationPicker.tsx` — tab between GPS/map/search
  - Shows radius preset selector + custom radius input
  - Shows offline/unavailable states clearly
  - Test: switching tabs shows correct method, offline state displayed when applicable
  - Expected: All 3 methods accessible, offline states clear

- [ ] **Step 5.8:** Integration test — all 3 methods produce same `TargetLocation`
  - Test: GPS result → TargetLocation, map pin → TargetLocation, search result → TargetLocation
  - All three have identical shape: `{ latitude, longitude, accuracy?, locationName?, source, timestamp }`
  - Expected: All methods produce compatible models

- [ ] **Step 5.9:** Create commit
  - Command: `git add . && git commit -m "feat: location selection — current GPS, map pin, search, offline cache"`
  - Expected: Clean commit at revision `v5-locations`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/services/LocationService.ts src/services/SearchService.ts src/services/MapCacheService.ts src/ui/MapView.tsx

# Unit tests
npx vitest run src/__tests__/services/LocationService.test.ts src/__tests__/services/SearchService.test.ts

# Real-device test (manual)
npx react-native run-ios --simulator "iPhone 14"  # or physical device
# GPS: verify coordinates accurate (±10m urban, ±50m rural)
# Map: place pin, verify coordinates match pin position
# Search: online → results, offline → error message
# Offline: disconnect network, verify cached tiles render
```

## Drift-Check Command

```bash
git diff v5-locations..HEAD -- src/models/TargetLocation.ts src/services/LocationService.ts src/services/SearchService.ts src/services/MapCacheService.ts src/hooks/useMapPin.ts src/ui/MapView.tsx
```
