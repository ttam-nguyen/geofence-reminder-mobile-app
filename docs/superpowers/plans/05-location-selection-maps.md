# Plan 5: Location Selection & Maps

## Feature Name
Location Selection — Current GPS, Map Pin, Address Search, Offline Maps + Saved Places

## Goal
Implement three location selection methods (current GPS, map pin placement, address/place search) that all produce the same canonical target-location model. Support offline map viewing with cached tiles.

## Architecture
- Current GPS: `Geolocation.watchPosition()` or one-shot `getCurrentPosition()` — wrapped in hook
- Map: `react-native-maps` with Mapbox source (offline tile caching)
- Search: Nominatim (OpenStreetMap Geocoding API), online only, 1 req/sec rate limit
- Offline indicator: cached map data status, search unavailable when offline

## Tech Stack
| Layer | Choice |
|---|---|
| Current GPS | `react-native-geolocation-service` (wrapper around native Geolocation) |
| Map | `react-native-maps` ^1.14.0 (legacy arch compatible with RN 0.74) |
| Search | Nominatim (OpenStreetMap Geocoding API) — no key needed, 1 req/sec |
| Offline caching | Mapbox offline package (tiles stored to disk) |
| Network | `fetch` API (React Native built-in), offline detection via `NetInfo` |

## Spec References
- §3.2 Location selection: current GPS, map pin, address/place search (see `docs/spec.md`)
- §3.2 Current GPS: fresh location with accuracy + timestamp, explain poor/unavailable accuracy
- §3.2 Map pin: Life360-style full-screen map, fixed center pin, user drags the map
- §3.2 Search: Nominatim (OpenStreetMap), no API key, rate-limited 1 req/sec
- §4 Offline-first: map caching respects provider licensing, offline search not required for MVP

## Global Constraints
- All three methods produce identical canonical `TargetLocation` model: `{ latitude, longitude, accuracy?, locationName? }`
- Map must show current location (if permission granted), saved reminders, radius circle
- Offline: previously cached tiles render, search clearly reports unavailable
- No live search when offline — no ambiguity
- Map provider: react-native-maps (already installed, legacy arch compatible)
- Search API: Nominatim (OpenStreetMap), no API key, rate-limited 1 req/sec
- Map pin UX: Life360 style — full-screen map, fixed center pin, user drags map to position
- **SavedPlace model:** Users can save locations with custom names for quick reminder creation

## Review Focus
- Current GPS returns valid coordinates with accuracy and timestamp
- Map shows current location, allows pin placement, displays radius circle
- Address search returns results when online, clear message when offline
- Cached tiles render correctly when offline (no network)
- All three methods produce same `TargetLocation` model
- SavedPlace model persists with CRUD operations
- MapScreen uses two-row layout (top map preview + bottom collapsible list)

## Files to Create

```
src/models/
  TargetLocation.ts          — Canonical target location model (used by all 3 methods)
  SavedPlace.ts              — User-saved locations for quick reminder creation

src/services/
  LocationService.ts         — Current GPS: getCurrentPosition, watchPosition (stubbed)
  SearchService.ts           — Address/place search via Nominatim (stubbed)
  MapCacheService.ts         — Offline tile caching: download, check availability, list cached areas

src/hooks/
  useCurrentLocation.ts      — Hook: current GPS coordinates + accuracy (stubbed)
  useMapPin.ts               — Hook: map pin placement, repositioning (stubbed)

src/ui/
  MapView.tsx                — Placeholder map (offline indicator, overlay count)
  CreateReminderLocationPicker.tsx — Screen: switch between GPS/map/search tabs (stubbed)
  MapScreen.tsx              — Full interactive map (stubbed, needs new two-row layout)
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

### SavedPlace Model (NEW) (`src/models/SavedPlace.ts`)

```typescript
export interface SavedPlace {
  id: string;              // UUID v4
  name: string;            // Custom label (e.g., "Home", "Office")
  latitude: number;
  longitude: number;
  address?: string | null; // From reverse geocoding
  createdAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
}

// Repository methods (to be added to ReminderRepositoryImpl):
function getAllSavedPlaces(): Promise<SavedPlace[]>;
function savePlace(place: Omit<SavedPlace, 'id' | 'createdAt' | 'updatedAt'>): Promise<SavedPlace>;
function deleteSavedPlace(id: string): Promise<boolean>;
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

export function getCurrentPosition(): Promise<LocationResult>;
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

// Forward geocoding: search for places by query string
export async function searchPlaces(query: string): Promise<SearchPlace[]>;
// Returns error when offline: throws Error with message "Location search requires internet connection"

// Reverse geocoding: get address from coordinates (for saving places)
export async function reverseGeocode(latitude: number, longitude: number): Promise<string | null>;

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

- [ ] **Step 5.3:** Implement map view component (stubbed — needs real integration)
  - `src/ui/MapView.tsx` exists as a placeholder `<View>` — children prop accepts actual map component
  - **TODO:** Replace with `react-native-maps` `<MapView>` showing:
    - Current location dot (if permission granted)
    - Reminder pins (from repository)
    - Radius circle (when creating/editing reminder)
    - Cached map indicator (bottom-left corner)
  - **TODO:** Integrate Life360-style fixed center pin: overlay a static pin at screen center, update pin coords on `onRegionChangeComplete`
  - Test: renders map component, shows current location dot when available
  - Expected: Map displays correctly on both platforms

- [ ] **Step 5.4:** Implement map pin placement hook
  - Create `src/hooks/useMapPin.ts` — handles map tap to place pin, drag to reposition
  - Test: placing pin updates position, radius circle updates
  - Expected: Pin placement works, radius circle follows pin

- [ ] **Step 5.5:** Implement address/place search service (stubbed — needs real API)
  - Create `src/services/SearchService.ts` — calls Nominatim (OpenStreetMap) Geocoding API
  - Forward geocoding: `https://nominatim.openstreetmap.org/search?format=json&q={query}`
  - Reverse geocoding: `https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}`
  - Rate limit: 1 request per second (implement a simple request queue)
  - Offline: returns error "Location search requires internet connection"
  - Test: online → returns places; offline → throws error with clear message
  - Expected: Search works when online, clear error when offline

- [ ] **Step 5.6:** Implement map cache service
  - Create `src/services/MapCacheService.ts` — checks/downloads cached tiles (Mapbox offline)
  - Test: `isAreaCached()` returns correct boolean, `downloadArea()` stores tiles to disk
  - Expected: Cached tiles available offline, download status tracked

- [ ] **Step 5.7:** Implement location picker screen (stubbed — needs real integration)
  - `src/ui/CreateReminderLocationPicker.tsx` exists with tab UI (GPS/map/search)
  - **TODO:** Wire up real GPS via `useCurrentLocation()` hook (already exists, returns stub data)
  - **TODO:** Wire up map pin via `useMapPin()` hook (already exists, returns stub data)
  - **TODO:** Wire up search via Nominatim API (forward geocoding, 1 req/sec rate limit)
  - **TODO:** Add "Save Location" button to save current pin as a `SavedPlace`
  - Shows radius preset selector + custom radius input
  - Shows offline/unavailable states clearly
  - Test: switching tabs shows correct method, offline state displayed when applicable
  - Expected: All 3 methods accessible, offline states clear

- [ ] **Step 5.8:** Integration test — all 3 methods produce same `TargetLocation`
  - Test: GPS result → TargetLocation, map pin → TargetLocation, search result → TargetLocation
  - All three have identical shape: `{ latitude, longitude, accuracy?, locationName?, source, timestamp }`
  - Expected: All methods produce compatible models

- [ ] **Step 5.9 (NEW):** Implement `SavedPlace` model and persistence
  - Create `src/models/SavedPlace.ts` — `{ id, name, latitude, longitude, address?, createdAt, updatedAt }`
  - Add to SQLite schema (table: `saved_places`)
  - Add repository methods: `getAllSavedPlaces()`, `savePlace(place)`, `deletePlace(id)`
  - Test: CRUD operations work, data persists across app restarts
  - Expected: Users can save locations with custom names for quick reminder creation

- [ ] **Step 5.10 (NEW):** Wire MapScreen with new layout
  - Top 1/3: map preview using `react-native-maps` with `fitBounds` to show all reminders
  - Bottom 2/3: collapsible list grouped by `SavedPlace` — each cell shows name + active reminder count
  - When expanded, shows list of reminders under that saved place
  - Test: map preview fits all reminders, list groups by saved place, expand/collapse works
  - Expected: MapScreen shows map preview + collapsible grouped list

- [ ] **Step 5.11:** Create commit
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

## Summary for Handoff

**What was implemented (stubbed, not real):**
- `TargetLocation` canonical model — correct shape for all 3 methods
- `LocationService.ts` — stub returns San Francisco coordinates (50m accuracy)
- `SearchService.ts` — stub returns single mock place, offline check works
- `MapCacheService.ts` — stub methods (isTileCached always true, downloadArea does nothing)
- `useCurrentLocation()` hook — wraps stub LocationService
- `useMapPin()` hook — manages pin position and radius state (10–500m clamped)
- `MapView.tsx` — placeholder `<View>` with offline badge and accessibility label
- `CreateReminderLocationPicker.tsx` — tab UI (GPS/map/search) with radius presets and location summary
- `CreateReminderScreen.tsx` — full form with 3 location tabs, stub handlers showing Alert dialogs
- All 3 stub methods produce valid `TargetLocation` objects with correct source enum

**What still needs to be done (next plans):**
- **Plan 5 extension:** Replace stub GPS with real `react-native-geolocation-service` call
- **Plan 5 extension:** Replace stub map with real `react-native-maps` integration (Life360-style fixed pin)
- **Plan 5 extension:** Implement Nominatim search API (forward + reverse geocoding)
- **Plan 5 extension:** Create `SavedPlace` model and SQLite persistence
- **Plan 5 extension:** Rewrite MapScreen layout (top map preview + bottom collapsible list)
- **Plan 5 extension:** Wire "Save Location" button to save current pin as SavedPlace
- **Plan 6 extension:** Wire geofence event bridge (native event → GeofenceEventProcessor → state transition → notification)
- **Plan 7 extension:** Update MapScreen with new two-row layout
