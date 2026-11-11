# HANDOFF — AI Context Notes

**NOT FOR PRODUCTION.** This file contains context, status, and decisions for AI agents working on this project. It is gitignored (not committed).

---

## What Works (Verified from Code)

### Models & State Machine
- **Reminder model** (`src/models/Reminder.ts`) — Full schema with all fields, validation for title (1-100), description (0-500), radius (10-500m)
- **ReminderStatus enum** (`src/models/ReminderStatus.ts`) — 7 states: DRAFT, WAITING_FOR_EXIT, ARMED, TRIGGERED, COMPLETED, CANCELLED, PAUSED
- **State machine** (`src/services/StateMachine.ts`) — 21 valid transitions, all defined and tested
- **SQLite adapter** (`src/data/SQLiteAdapter.ts`) — Full CRUD for reminders, locations, events
- **Zustand stores** (`src/stores/`) — reminderStore (create, update, delete, load, activate/deactivate), notificationStore
- **All 7 UI screens** (`src/ui/`) — Onboarding, HomeDashboard, CreateReminder, ReminderList, ReminderDetail, MapScreen, Settings
- **Design system** (`src/theme/`) — ThemeProvider with colors, typography, spacing, radii, elevation, motion tokens

### Working Features (Stubbed Data)
- Creating reminders with all form fields
- Saving and deleting reminders (SQLite persistence works)
- Loading and editing reminders (full form with 3 location tabs)
- Activating/deactivating reminders (status transitions work in state machine)

---

## What's Stubbed (Not Real Functionality)

### Geofence Bridge — COMPLETELY BROKEN
The chain from native geofence events to state changes is broken:

1. **`useGeofencing()` hook** (`src/hooks/useGeofencing.ts`) — Collects events into an array via `onGeofenceEvent()`, but nothing consumes them
2. **`GeofenceEventProcessor.ts`** (`src/native/GeofenceEventProcessor.ts`) — Process method exists but is **never instantiated** anywhere in the codebase
3. **`NotificationService.scheduleReminderNotification()`** (`src/services/NotificationService.ts`) — Method exists but is **never called** when a reminder transitions to TRIGGERED

**Fix needed:** A consumer that reads events from `useGeofencing()` and passes them to `GeofenceEventProcessor.processEvent()`, which then calls `NotificationService.scheduleReminderNotification()` when transitioning to TRIGGERED.

### Location Services — Stubbed with Hardcoded SF Coordinates
- **`LocationService.ts`** (`src/services/LocationService.ts`) — Returns San Francisco coordinates (37.7749, -122.4194) with 50m accuracy regardless of actual device location
- **`SearchService.ts`** (`src/services/SearchService.ts`) — Returns single mock place (San Francisco City Hall), offline check works but search does nothing
- **`MapCacheService.ts`** (`src/services/MapCacheService.ts`) — Stub methods (isTileCached always true, downloadArea does nothing)

### Map Integration — No Real Map
- **`MapView.tsx`** (`src/ui/MapView.tsx`) — Placeholder `<View>` with offline badge and accessibility label, no actual map component
- **`MapScreen.tsx`** (`src/ui/MapScreen.tsx`) — References MapView but shows no map, no pin placement, no radius circles
- **`useMapPin()`** (`src/hooks/useMapPin.ts`) — Manages pin position and radius state (10-500m clamped) but no real map interaction

---

## What Needs Implementation (Priority Order)

### 1. Fix Geofence Bridge (Critical — blocks device testing)
- Wire `GeofenceEventProcessor` into the app lifecycle (app resume / reminder activate)
- Connect `useGeofencing()` event array to processor via a consumer hook or effect
- Wire `NotificationService.scheduleReminderNotification()` into the TRIGGERED transition
- Test: entering a reminder's geofence should fire notification (sound + vibration)

### 2. Replace Stubbed Location Services
- **GPS:** Replace stub with real `react-native-geolocation-service` call in `useCurrentLocation()`
- **Map:** Replace stub MapView with `react-native-maps` integration (Life360-style: full-screen map, fixed center pin, user drags map to position)
- **Search:** Implement Nominatim API (forward + reverse geocoding), rate-limited to 1 req/sec
- **SavedPlace:** Create model, SQLite persistence, and "Save Location" button in location picker

### 3. Update MapScreen Layout
- Two-row layout: top 1/3 map preview (fitBounds to all reminders), bottom 2/3 collapsible list grouped by SavedPlace
- Map preview uses `react-native-maps` with `fitBounds`
- List groups reminders by SavedPlace, shows name + active count, expand/collapse

---

## Known Issues

1. **Geofence bridge is completely broken** — Native events are collected but never processed. Notifications never fire when entering a reminder's geofence. This is the #1 priority fix.

2. **All location data is stubbed** — Hardcoded San Francisco coordinates (37.7749, -122.4194) with 50m accuracy. No real GPS, map, or search functionality.

3. **Plans 6 and 7 were marked "Done"** in the original README — they are stubbed, not real. The state machine and UI screens exist but services are not wired to them.

4. **Version number mismatch** — README says 0.3.0, HANDOFF says 0.2.0. Spec references use v1.0.0. Use the version in HANDOFF (0.2.0) as source of truth for plan versions.

5. **Notification system is stubbed** — NotificationModule and NotificationService exist but don't schedule real notifications. Local notification library (e.g., `react-native-notifications` or expo-notifications) needs to be integrated.

6. **Native modules have TypeScript interfaces but no bridge** — GeofencingModule and NotificationModule declare methods but the actual native code (in `native-modules/`) may not be fully implemented.
7. **TRIGGERED state: spec says COMPLETED + CANCELLED, code only allows COMPLETED** — The actual StateMachine.ts only permits TRIGGERED → COMPLETED (no CANCELLED transition). If cancellation from triggered state is needed, update StateMachine.ts.

---

## Decisions & Rationale

| Decision | Choice | Reason |
|---|---|---|
| Framework | React Native 0.74.4 (TypeScript) | Flutter was originally considered but RN has better geofencing docs and larger community |
| State Management | Zustand v4.5.2 | Lightweight, no boilerplate; v5 has Hermes compatibility issues |
| Navigation | React Navigation 6.x | RN 0.74 compatible (v7 requires newer RN) |
| Storage | react-native-sqlite-storage v6.0.1 | Reliable, well-documented, works with RN 0.74 |
| Maps | react-native-maps ^1.14.0 | Old arch compatible with RN 0.74 (newer versions require New Architecture) |
| Search API | Nominatim (OpenStreetMap) | No API key needed, rate-limited 1 req/sec, perfect for MVP |
| iOS Minimum | iOS 13+ | Covers ~95% of active devices, supports background location |
| Android Minimum | API 29 (Android 10) | Covers ~95% of active devices, supports background location |
| Design System | Glass Layered (dark mode first) | User-specified — Graphite background, frosted glass cards, signal-red accents |
| Reminder Lifecycle | TRIGGERED is terminal | Matches app's one-action purpose; no re-arming needed |

---

## Agent Rules (from AGENTS.md)

1. **One agent, one file** — Only modify the file you are working on.
2. **Read before writing** — Understand existing code, don't overwrite without reading.
3. **Minimal changes** — Small diffs are better than large rewrites.
4. **Write tests first** — Tests must pass before committing.
5. **Follow the spec** — Cross-reference `docs/spec.md` for requirements.

---

## File Map (Key Files)

| Category | Path | Status |
|---|---|---|
| State machine | `src/services/StateMachine.ts` | ✅ Working (21 transitions) |
| Reminder model | `src/models/Reminder.ts` | ✅ Working |
| Status enum | `src/models/ReminderStatus.ts` | ✅ Working (7 states) |
| SQLite adapter | `src/data/SQLiteAdapter.ts` | ✅ Working (CRUD) |
| Reminder store | `src/stores/reminderStore.ts` | ✅ Working (Zustand) |
| Geofence hook | `src/hooks/useGeofencing.ts` | ⚠️ Collects events, nothing consumes |
| Event processor | `src/native/GeofenceEventProcessor.ts` | ⚠️ Exists, never instantiated |
| Notification service | `src/services/NotificationService.ts` | ⚠️ Exists, never called for TRIGGERED |
| Location service | `src/services/LocationService.ts` | ❌ Stub (SF coordinates) |
| Search service | `src/services/SearchService.ts` | ❌ Stub (mock place) |
| Map view | `src/ui/MapView.tsx` | ❌ Stub (no map component) |
| Map screen | `src/ui/MapScreen.tsx` | ❌ Stub (no map integration) |
| Location picker | `src/ui/CreateReminderLocationPicker.tsx` | ❌ Stub (Alert dialogs) |
| All 7 screens | `src/ui/` | ✅ UI exists, services stubbed |
| Design system | `src/theme/` | ✅ Working (tokens + provider) |
