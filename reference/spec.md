# GPS Reminder — Specification

## 1. Product Overview

A location-triggered reminder app. Users create reminders tied to a place and radius. When the device detects entry into that area, it fires a local notification (sound + vibration). No time-based triggers — purely geographic.

**Core philosophy:** One-action reminders, not recurring tasks. "When I enter the grocery store, remind me to buy eggs." If someone needs something repeatedly, they don't need an app for it.

---

## 2. Platforms

- **iOS:** Minimum iOS 13+, covers ~95% of active devices, supports background location
- **Android:** Minimum API 29 (Android 10), covers ~95% of active devices, supports background location

---

## 3. Domain Models

### 3.1 Reminder

```typescript
interface Reminder {
  id: string;                          // UUID v4
  title: string;                       // 1–100 chars, required
  description: string | null;          // 0–500 chars, optional
  latitude: number;                    // -90 to 90
  longitude: number;                   // -180 to 180
  locationName: string | null;         // Human-readable name (e.g., "Home")
  radiusMeters: number;                // 10–500m, clamped
  locationSource: LocationSource;      // How coordinates were obtained
  status: ReminderStatus;              // Lifecycle state
  createdAt: string;                   // ISO 8601
  updatedAt: string;                   // ISO 8601
  triggeredAt: string | null;          // ISO 8601, null if never
  completedAt: string | null;          // ISO 8601, null if never
  notificationSoundEnabled: boolean;   // Default: true
  notificationVibrationEnabled: boolean; // Default: true
}
```

### 3.2 ReminderStatus

```typescript
enum ReminderStatus {
  DRAFT = 'DRAFT',                      // Created but geofence not registered
  WAITING_FOR_EXIT = 'WAITING_FOR_EXIT', // User inside geofence, waiting for exit
  ARMED = 'ARMED',                      // User outside, registered to trigger on entry
  TRIGGERED = 'TRIGGERED',              // User entered; notification fired (terminal)
  COMPLETED = 'COMPLETED',              // User dismissed after trigger
  CANCELLED = 'CANCELLED',              // User cancelled/deleted
  PAUSED = 'PAUSED',                    // Monitoring paused, preserved but inactive
}
```

**Decision:** `TRIGGERED` is a terminal state. Once fired, the reminder can only transition to `COMPLETED`. No re-arming or cancellation from triggered state. If the user wants to repeat the reminder, they create a new one.

### 3.3 LocationSource

```typescript
enum LocationSource {
  CURRENT_GPS = 'current_gps',
  MAP_PIN = 'map_pin',
  PLACE_SEARCH = 'place_search',
}
```

### 3.4 TargetLocation

Canonical shape for all 3 location selection methods:

```typescript
interface TargetLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;    // meters (from GPS)
  locationName?: string; // from geocoding or manual entry
  source: LocationSource;
  timestamp: number;    // epoch ms
}
```

### 3.5 SavedPlace (new model)

User-saved locations for quick reminder creation:

```typescript
interface SavedPlace {
  id: string;                   // UUID v4
  name: string;                 // Custom label (e.g., "Home", "Office")
  latitude: number;
  longitude: number;
  address?: string | null;      // From reverse geocoding
  createdAt: string;            // ISO 8601
  updatedAt: string;            // ISO 8601
}
```

### 3.6 NotificationDeliveryRecord

Tracks notification delivery:

```typescript
interface NotificationDeliveryRecord {
  id: string;
  reminderId: string;
  notificationId: string;
  scheduledAt: string;
  deliveredAt: string | null;
  status: 'SCHEDULED' | 'DELIVERED' | 'FAILED';
  failureReason: string | null;
}
```

### 3.7 ReminderEvent

Audit trail for reminder state changes.

---

## 4. State Machine

21 valid transitions (defined in `src/services/StateMachine.ts`):

```
DRAFT       → ARMED, WAITING_FOR_EXIT, COMPLETED, CANCELLED, PAUSED
WAITING_FOR_EXIT → ARMED (on exit), COMPLETED, CANCELLED, PAUSED
ARMED       → TRIGGERED (on entry), COMPLETED, CANCELLED, PAUSED
TRIGGERED   → COMPLETED  (terminal — no re-arming, no cancellation from triggered)
COMPLETED   → DRAFT (re-create), CANCELLED
CANCELLED   → DRAFT (re-create)
PAUSED      → ARMED, WAITING_FOR_EXIT, COMPLETED, CANCELLED
```

**Initial status determination:** Based on user's current GPS position relative to the geofence radius (haversine distance calculation).
- Inside or on boundary → `WAITING_FOR_EXIT` (user already inside, waiting for exit)
- Outside → `ARMED` (registered to trigger on entry)

---

## 5. Geofencing Architecture

### 5.1 Native Modules

- **GeofencingModule** (`src/native/GeofencingModule.ts`): TypeScript interface for native geofence registration/unregistration/permissions + event listener.
- **NotificationModule** (`src/native/NotificationModule.ts`): TypeScript interface for native notification scheduling/cancellation/permissions.

### 5.2 GeofenceEventProcessor (`src/native/GeofenceEventProcessor.ts`)

Processes native geofence events (ENTER/EXIT) into state transitions:
- `WAITING_FOR_EXIT + EXIT → ARMED` (re-register geofence)
- `ARMED + ENTER → TRIGGERED` (fire notification, unregister geofence)
- `ARMED + EXIT → no transition` (entry-only reminders don't trigger)
- `DRAFT + ENTER → WAITING_FOR_EXIT` (user walked inside target radius)

**Idempotency:** `TRIGGERED` reminders ignore further events. Exactly one notification per trigger.

### 5.3 RegistrationManager (`src/services/RegistrationManager.ts`)

Maps reminders ↔ native geofences:
- Capacity policy: iOS 20 regions, Android 500 geofences
- Priority-based dropping when over limit: `ARMED=3 > WAITING_FOR_EXIT=2 > DRAFT=1`
- Re-registration on status changes (ARMED, WAITING_FOR_EXIT)

### 5.4 Geofence Bridge (needs implementation)

The chain from native event to state change:
1. Native module emits geofence events (ENTER/EXIT)
2. `onGeofenceEvent()` listener in `useGeofencing()` collects events into an array
3. **Missing:** A consumer that reads these events and passes them to `GeofenceEventProcessor.processEvent()`
4. **Missing:** The event processor must call `NotificationService.scheduleReminderNotification()` when a reminder transitions to `TRIGGERED`

### 5.5 Background Constraints

- App restart: eligible reminders re-registered (where OS supports)
- Device restart: eligible reminders recover (Android: works, iOS: limited)
- Swipe-away / force-stop: document OS limitations, cannot guarantee behavior
- Simulator testing is **insufficient** for geofencing validation — real-device testing required

---

## 6. Notification Requirements

- Local notification (no internet required for delivery)
- Sound plays when OS allows and user enabled it
- Vibration occurs when supported and enabled
- Notification permission denial: clear user-facing message
- SMS is out of scope for MVP

---

## 7. UI Requirements

### 7.1 Visual Direction

**Glass Layered** (dark mode first) — Graphite background (`#171D22`), frosted glass cards, signal-red accents (`#F52232`).

### 7.2 Required Screens (7 screens)

| Screen | Purpose |
|---|---|
| Onboarding | 3-screen flow: concept, location need, notification permissions |
| Home Dashboard | Active count, quick actions, bottom tabs (Home, Map, Settings) |
| Create Reminder | Full form: title, description, 3 location methods, radius, save |
| Reminder List | Search/filter, status badges, edit/delete |
| Reminder Detail | Full content, map preview, state, edit/delete |
| Map | Full interactive map with current location, all reminders, radius circles |
| Settings | Notification preferences, privacy info, app information |

### 7.3 Design System Tokens

| Category | Details |
|---|---|
| Colors | Graphite `#171D22`, Frost `#E5EAED`, Signal Red `#F52232`, Waiting Amber `#D99A42`, Success Green `#3C8D70` |
| Typography | 6 sizes (26/19/17/15/13/11). Primary: Inter, Technical labels: IBM Plex Mono |
| Spacing | 4dp grid: 4, 8, 12, 16, 20, 24, 32, 48 |
| Radii | Small: 10, Input: 14, Card: 20, Large: 24, Pill/Modal: 28 |
| Elevation | Graphite shadow (blur 18, offset 0,6) |
| Motion | Includes `durationReduced` for accessibility (reduced-motion preference) |

---

## 8. Advertising (Plans 8, 9 — not MVP core)

### 8.1 Advertising Rules

- Banner ads and list ads only (no forced full-screen)
- Optional rewarded ads (user-initiated from Settings)
- Clearly label ads, visually separate from reminders
- Ad failure/offline must not affect reminder functionality
- Do not load ads in blocking way
- Consent, privacy, age-related requirements, platform advertising policies

### 8.2 Paid Themes (Plan 9 — not MVP core)

- In-app purchase for premium themes
- Does not block core functionality
- Graceful fallback to free themes

---

## 9. Constraints

1. **No SMS triggers** — location only
2. **Offline-first** — core features work offline (create, view, edit reminders)
3. **Accessibility:** WCAG AA contrast (≥ 4.5:1 for body text), text scaling, screen reader labels
4. **Responsive:** Minimum 375px width (iPhone SE 2nd gen), safe area respected
5. **No forced full-screen ads** (N/A for MVP — Plans 8, 9)
6. **TRIGGERED is terminal** — no re-arming; create new reminder to repeat
7. **No live search when offline** — clear message, not blocking

---

## 10. Quality, Reliability & Acceptance Criteria

21 acceptance scenarios (spec §10) that must pass on real devices (iOS 13+ and Android 10+):

- Scenarios 1–12: Core reminder functionality (create, view, edit, delete, status transitions)
- Scenarios 13: Offline creation works (no network required)
- Scenarios 14: Geofence registration/unregistration works correctly
- Scenarios 15: Search offline message displayed clearly
- Scenarios 16: Ad network failure/offline does not block reminders
- Scenarios 17: Notification permission denial explained to user
- Scenarios 18: Location revocation detected and handled
- Scenarios 19–21: Performance, battery, store compliance

**Real-device validation required for:** Plan 3 (geofencing), Plan 10 (release). Simulator testing is **insufficient** for geofencing validation.

---

## 11. Release Hardening (Plan 10)

### 11.1 Release Candidate Requirements

- No duplicate completions
- Correct state restoration after app restart
- Offline core behavior verified
- No continuous GPS polling (battery drain)
- Clear permission/monitoring status in UI
- No blocking dependency on ads/network

### 11.2 Store Compliance

- Privacy documentation (location usage, notification usage)
- Platform advertising policies (if applicable)
- Age-related content requirements
- Store review guidelines compliance

---

## Geofencing Limits

- **iOS:** 20 regions per app
- **Android:** 500 geofences per app

When over limit, drop lowest-priority reminders:
- `ARMED` (priority 3) > `WAITING_FOR_EXIT` (priority 2) > `DRAFT` (priority 1)
- Within same priority: drop oldest first

---

## File Structure

```
src/
├── models/          # Domain models (Reminder, ReminderStatus, LocationSource, TargetLocation, SavedPlace)
├── services/        # Business logic (StateMachine, RegistrationManager, SearchService, MapCacheService)
├── native/          # TypeScript interfaces for native modules (GeofencingModule, NotificationModule, GeofenceEventProcessor)
├── stores/          # Zustand stores (reminderStore, notificationStore)
├── data/            # Persistence layer (SQLiteAdapter, ReminderRepositoryImpl)
├── theme/           # Design tokens + ThemeProvider (colors, typography, spacing, radii, elevation, motion)
├── hooks/           # React hooks (useGeofencing, useCurrentLocation, useMapPin)
├── ui/              # UI components (MapView, CreateReminderLocationPicker, all screens)
├── navigation/      # Navigation shell (AppNavigator, navigationTypes)
└── __tests__/       # All unit tests (mirrors src/ structure)

native-modules/      # Native code (iOS Swift/Obj-C, Android Kotlin)
docs/                # Documentation (spec, plans)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.74.4 (TypeScript, strict mode) |
| State Management | Zustand v4.5.2 |
| Navigation | React Navigation 6.x (Stack + Bottom Tabs) |
| Storage | react-native-sqlite-storage v6.0.1 |
| Maps | react-native-maps ^1.14.0 (legacy arch compatible with RN 0.74) |
| Geolocation | react-native-geolocation-service (wrapper around native Geolocation) |
| Network | NetInfo for offline detection, fetch API |
| Testing | Vitest + React Native Test Renderer |
| E2E Testing | Maestro (YAML flow tests) |

**Minimum supported:** iOS 13+, Android 10 (API 29).

---

## Decision Log

| Decision | Choice | Reason |
|---|---|---|
| Framework | React Native 0.74.4 (TypeScript) | Flutter was originally considered but RN has better geofencing docs and larger community |
| State Management | Zustand v4.5.2 | Lightweight, no boilerplate; v5 has Hermes compatibility issues |
| Navigation | React Navigation 6.x | RN 0.74 compatible (v7 requires newer RN) |
| Storage | react-native-sqlite-storage v6.0.1 | Reliable, well-documented, works with RN 0.74 |
| Maps | react-native-maps ^1.14.0 | Old arch compatible with RN 0.74 (newer versions require New Architecture) |
| Geolocation | react-native-geolocation-service | Wrapper around native Geolocation API |
| Search API | Nominatim (OpenStreetMap) | No API key needed, rate-limited, perfect for MVP |
| iOS Minimum | iOS 13+ | Covers ~95% of active devices, supports background location |
| Android Minimum | API 29 (Android 10) | Covers ~95% of active devices, supports background location |
| Design System | Glass Layered (dark mode first) | User-specified design direction — Graphite background, frosted glass cards, signal-red accents |
| Reminder Lifecycle | TRIGGERED is terminal | Matches app's one-action purpose; no re-arming needed |
