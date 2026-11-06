# Handoff — GPS Reminder Mobile App

## Project Overview

**What this app does:** A location-triggered reminder app. Users create reminders tied to a place and radius. When the device detects entry into that area, it fires a local notification (sound + vibration). No time-based triggers — purely geographic.

**Tech stack:** React Native 0.74.4 + TypeScript (strict mode) + Zustand (state) + SQLite (local storage).

**Minimum supported:** iOS 13+, Android 10 (API 29).

---

## Current State: Plan 5 Complete

**Last committed:** `3b9c9e3b` (Plan 5 — Location Selection & Maps)

**Tests passing:** 179/179 ✅
**TypeScript:** Compiles clean ✅

### Plans Completed (0–5)

| Plan | Status | Commit | What it delivers |
|---|---|---|---|
| 0 — Project Setup | ✅ Done | `15f8673` | Package.json, tsconfig, eslint, vitest, entry point |
| 1 — Design System | ✅ Done | `55c50c3e` + `4235e9ca` | Glass Layered tokens, ThemeProvider, 6 reusable components (Button, Input, Card, Badge, Divider, SafeAreaWrapper), navigation shell |
| 2 — Reminder Domain | ✅ Done | `6197a7bd` | Models (Reminder, ReminderStatus, LocationSource), state machine (21 transitions), SQLite persistence, Zustand store |
| 3 — Native Geofencing POC | ✅ Done | `c832252a` | TypeScript interfaces, React hook (useGeofencing), iOS native (Swift/Obj-C), Android native (Kotlin/BroadcastReceiver) |
| 4 — Geofence Orchestration | ✅ Done | `eb9dbe17` | RegistrationManager (capacity policy: iOS 20 / Android 500), GeofenceEventProcessor (event→state transitions, idempotency) |
| 5 — Location Selection & Maps | ✅ Done | `9afc7461` | TargetLocation model, LocationService (GPS stubs), SearchService (online search), MapCacheService (tile caching), useCurrentLocation + useMapPin hooks, MapView + CreateReminderLocationPicker UI |

### Plans Remaining (6–10)

| Plan | Feature | Depends On | What it delivers |
|---|---|---|---|
| 6 | Notifications & Recovery | 2, 3 | Local notification delivery (sound/vibration), permission status UI, app/device restart recovery |
| 7 | Core UI Flows | 1, 2, 5, 6 | All 7 screens (onboarding, home, create, list, details, map, settings) wired with real navigation |
| 8 | Advertising | 7 | Banner ads, list ads, rewarded ads, consent flow (GDPR/CCPA) |
| 9 | Paid Themes | 1, 7 | Theme marketplace with IAP (purchase, restore, entitlements) |
| 10 | Release Hardening | All | Real-device test matrix (21 scenarios), performance profiling, store metadata, release builds |

**Earliest vertical slice for testing on device:** Plans 0 → 2 → 3 → 4 → 6
Result: Create reminder → geofence register → trigger → notify (no UI polish).

---

## Architecture — How It's Organized

```
src/
├── models/          # Domain models (Reminder, ReminderStatus, LocationSource, TargetLocation)
├── services/        # Business logic (StateMachine, RegistrationManager, SearchService, MapCacheService)
├── native/          # TypeScript interfaces for native modules (GeofencingModule, GeofenceEventProcessor)
├── stores/          # Zustand stores (reminderStore)
├── data/            # Persistence layer (SQLiteAdapter, ReminderRepositoryImpl)
├── theme/           # Design tokens + ThemeProvider (colors, typography, spacing, radii, elevation, motion)
├── hooks/           # React hooks (useGeofencing, useCurrentLocation, useMapPin)
├── ui/              # UI components (MapView, CreateReminderLocationPicker)
├── navigation/      # Navigation shell (AppNavigator, navigationTypes)
└── __tests__/       # All unit tests (mirrors src/ structure)

native-modules/      # Native code (iOS Swift/Obj-C, Android Kotlin)
docs/superpowers/plans/  # All implementation plans (0–10)
```

### Key Files — What Each Does

#### Models (src/models/)
- **ReminderStatus.ts** — Enum: DRAFT → WAITING_FOR_EXIT/ARMED/TRIGGERED → COMPLETED/CANCELLED
- **LocationSource.ts** — Enum: CURRENT_GPS, MAP_PIN, PLACE_SEARCH
- **Reminder.ts** — Entity with all fields + validateReminder() + createReminder() + updateReminder()
- **TargetLocation.ts** — Canonical shape for all 3 location methods (latitude, longitude, accuracy?, locationName?, source, timestamp)
- **ReminderEvent.ts** — Event log entries for audit trail
- **NotificationDeliveryRecord.ts** — Tracks notification delivery (id, reminderId, deliveredAt, status)

#### Services (src/services/)
- **StateMachine.ts** — 21 valid transitions, haversine distance calc, determineInitialStatus()
- **ReminderRepository.ts** — Interface (port) for all data access (Reminder, Event, NotificationLog)
- **RegistrationManager.ts** — Maps reminders ↔ native geofences, capacity policy (iOS 20 / Android 500), priority-based dropping (ARMED=3 > WAITING_FOR_EXIT=2 > DRAFT=1)
- **GeofenceEventProcessor.ts** — Converts native ENTER/EXIT events into state machine transitions, idempotency (TRIGGERED reminders ignore further events)
- **LocationService.ts** — getCurrentPosition() + watchPosition() stubs (returns mock data until device integration)
- **SearchService.ts** — Online-only place search with OfflineError when offline
- **MapCacheService.ts** — Tile caching: downloadArea, isTileCached, isAreaCached

#### Native (src/native/)
- **GeofencingModule.ts** — TypeScript interface for native geofence registration/unregistration/permissions + onGeofenceEvent() listener
- **GeofenceEventProcessor.ts** — Processes native geofence events (ENTER/EXIT) into state transitions

#### Data (src/data/)
- **SQLiteAdapter.ts** — SQLite database operations (create tables, CRUD)
- **ReminderRepositoryImpl.ts** — Implements ReminderRepository + EventRepository + NotificationLogRepository ports

#### Stores (src/stores/)
- **reminderStore.ts** — Zustand store: CRUD operations, state machine integration (validates transitions), automatic initial status determination

#### Hooks (src/hooks/)
- **useGeofencing.ts** — Wraps native module: register, unregister, clearAll, checkPermissions, event listening, app state handling
- **useCurrentLocation.ts** — One-shot current GPS with loading/error states
- **useMapPin.ts** — Pin placement on map, radius clamping (10–500m), reset

#### UI (src/ui/)
- **MapView.tsx** — Placeholder map with offline indicator, overlay count for accessibility (children = actual map component)
- **CreateReminderLocationPicker.tsx** — GPS/map/search tabs, radius presets (100m/200m/500m/1km), offline banner, location summary

#### Theme (src/theme/)
- **colors.ts** — Glass Layered palette: Graphite #171D22, Frost #E5EAED, Signal red #F52232, Waiting amber #D99A42, Success green #3C8D70
- **typography.ts** — 6 sizes (26/19/17/15/13/11), Inter primary, IBM Plex Mono for technical labels
- **spacing.ts** — 4dp grid (4–48)
- **radii.ts** — small 10, input 14, card 20, large 24, pill/modal 28
- **elevation.ts** — Graphite shadow (blur 18, offset 0,6)
- **motion.ts** — Includes durationReduced for accessibility (reduced-motion preference)
- **ThemeContext.tsx** — ThemeProvider + useTheme() hook, auto dark mode detection

#### Navigation (src/navigation/)
- **AppNavigator.tsx** — Stack + Bottom Tabs navigation shell (placeholder screens)
- **navigationTypes.ts** — TypeScript types for all routes

---

## What You Can Run Right Now (No Device Needed)

```bash
# Verify TypeScript compiles clean
npx tsc --noEmit

# Run all 179 unit tests
npx vitest run

# Lint check (no prettier rule — known issue)
npx eslint src/
```

**These all pass.** You can implement, test, and commit safely without a device.

---

## How to Run on a Device (When Plans 6+7 Are Done)

### Prerequisites
- macOS with Xcode installed (iOS)
- Android Studio + platform tools (Android)
- A physical device or simulator/emulator

### iOS
```bash
cd ios && pod install && cd ..
npx react-native run-ios --simulator "iPhone 14"   # simulator
# or physical device:
npx react-native run-ios --device "My iPhone"
```

### Android
```bash
npx react-native run-android --variant=debug         # emulator or connected device
# For physical device, enable USB debugging first
```

**Note:** CocoaPods must be installed on your Mac (`brew install cocoapods`). The RN init step that normally runs `pod install` was skipped during project setup.

---

## Known Issues / Gotchas

### 1. ESLint + Prettier Conflict
The prettier rule is disabled in `.eslintrc.js` due to a version conflict between `eslint-plugin-prettier` and Prettier 3.x. To fix: either downgrade eslint-plugin-prettier to v4, or upgrade Prettier to 4.x when ready. **This is cosmetic — it does not affect functionality.**

### 2. Legacy Peer Deps
All dependencies were installed with `--legacy-peer-deps` because `react-native-maps` requires `react >= 18.3.1` while RN 0.74 ships with react 18.2.0. This is acceptable for now but should be revisited when upgrading to RN 0.75+.

### 3. Stub Services (Plans 3, 5)
Several services return mock/stub data until device integration:
- **LocationService.ts** — `getCurrentPosition()` returns San Francisco coordinates with 10m accuracy
- **SearchService.ts** — `searchPlaces()` returns a single mock place
- **MapView.tsx** — Renders children (actual map component); without `react-native-maps` installed, it's a placeholder

These are intentional stubs. Replace them with real API calls when integrating with actual devices (Plans 6–7).

### 4. Native Modules Not Linked
The native geofencing code exists in `native-modules/ios/` and `native-modules/android/` but has not been linked into the Xcode project or Android Gradle build. Linking happens when you run `pod install` (iOS) and rebuild (Android).

### 5. No Real App Shell Yet
`src/app.tsx` is a placeholder. The actual navigation shell (AppNavigator) exists but screens are not wired up to real routes. Plan 7 builds the full app shell with navigation between all screens.

### 6. react-native-maps Not Installed
The package is in `package.json` but `node_modules` was never fully built (project was set up for planning, not running). Install with `npm install --legacy-peer-deps` after cloning.

---

## Decision Log — Why We Chose What

| Decision | Choice | Reason |
|---|---|---|
| Framework | React Native 0.74.4 (TypeScript) | Flutter was originally requested but RN has better geofencing docs, larger community, and we needed a proven path for background location |
| State Management | Zustand v4.5.2 | Lightweight, no boilerplate, works with Hermes (v5 has Hermes compatibility issues) |
| Navigation | React Navigation 6.x | RN 0.74 compatible (v7 requires newer RN) |
| Storage | react-native-sqlite-storage v6.0.1 | Reliable, well-documented, works with RN 0.74 |
| Maps | react-native-maps ^1.14.0 | Old arch compatible with RN 0.74 (newer versions require New Architecture) |
| Ads | react-native-google-mobile-ads ^13.2.0 | Legacy version compatible with RN 0.74 (v17+ requires RN 0.86 + New Arch) |
| IAP | react-native-iap ^12.16.0 | Nitro Modules in v14+ incompatible with RN 0.74 |
| iOS Minimum | iOS 13+ | Covers ~95% of active devices, supports background location |
| Android Minimum | API 29 (Android 10) | Covers ~95% of active devices, supports background location |
| Design System | Glass Layered (dark mode first) | User-specified design direction — Graphite background, frosted glass cards, signal-red accents |

---

## Plans 6–10 — What's Left to Build

### Plan 6: Notifications & Recovery
**Goal:** Local notification delivery (sound + vibration), permission status UI, app/device restart recovery.

**Key files to create:**
- `src/native/NotificationModule.ts` — TypeScript interface for native notification module
- `ios/GPSReminder/NotificationModule.swift` — iOS: UNUserNotificationCenter, alert sound
- `android/.../NotificationModule.k` — Android: NotificationManager, sound, vibration
- `src/services/NotificationService.ts` — Schedule notifications, play sound/vibration
- `src/services/RecoveryService.ts` — Re-register eligible reminders on app start and device boot
- `src/stores/notificationStore.ts` — Zustand store for notification state
- `src/ui/PermissionStatusView.tsx` — Display permission status + recovery guidance

**Integration points:**
- `GeofenceEventProcessor` (Plan 4) → triggers notifications when reminder TRIGGERED
- `ReminderRepository` (Plan 2) → stores notification delivery records

### Plan 7: Core UI Flows
**Goal:** All 7 required screens from spec §7.2, wired with real navigation and real services (maps, GPS, search).

**Key files to create:**
- `src/ui/OnboardingScreen.tsx` — 3-screen onboarding (concept, location, notifications)
- `src/ui/HomeScreen.tsx` — Dashboard: active count, quick actions, bottom tabs
- `src/ui/CreateReminderScreen.tsx` — Full create form (title, description, 3 location methods, radius)
- `src/ui/ReminderListScreen.tsx` — Search/filter, status badges, edit/delete
- `src/ui/ReminderDetailScreen.tsx` — Full content, map preview, state, edit/delete
- `src/ui/MapScreen.tsx` — Full interactive map with react-native-maps
- `src/ui/SettingsScreen.tsx` — Preferences, theme selection (placeholder), privacy info
- `src/ui/components/` — ReminderListItem, OfflineBanner, PermissionWarning

**Integration points:**
- Consumes Zustand stores from Plans 2–6
- Uses design tokens from Plan 1 (no hardcoded styles)
- Replaces placeholder MapView with real react-native-maps

### Plan 8: Advertising
**Goal:** Banner ads, list ads, rewarded ads, consent flow (GDPR/CCPA).

**Key files:** AdService.ts, ConsentService.ts, AdBanner.tsx, AdListItem.tsx, RewardedAdModal.tsx

**Constraint:** Ads never during reminder creation/editing/save/alert delivery. Ad failure must not block core functionality.

### Plan 9: Paid Themes
**Goal:** Theme marketplace with IAP (purchase, restore, entitlements). Default theme always free.

**Key files:** ThemeService.ts, PurchaseService.ts, themeStore.ts, ThemeStoreScreen.tsx, theme config files

### Plan 10: Release Hardening
**Goal:** Real-device test all 21 acceptance scenarios, performance profiling, store metadata, release builds.

**Key files:** spec10-acceptance.test.ts, release-checklist.md, privacy-policy.md, store listing metadata

---

## File Reference — All Source Files (Current State)

### src/models/
```
LocationSource.ts        — Enum: CURRENT_GPS, MAP_PIN, PLACE_SEARCH
ReminderStatus.ts        — Enum: DRAFT, WAITING_FOR_EXIT, ARMED, TRIGGERED, COMPLETED, CANCELLED
Reminder.ts              — Entity + validateReminder() + createReminder() + updateReminder()
TargetLocation.ts        — Canonical shape (lat, lng, accuracy?, name?, source, timestamp)
ReminderEvent.ts         — Event log entry (id, reminderId, type, timestamp)
NotificationDeliveryRecord.ts — Delivery tracking (id, reminderId, deliveredAt, status)
index.ts                 — Re-exports all models
```

### src/services/
```
StateMachine.ts          — 21 transitions, haversine distance, determineInitialStatus()
ReminderRepository.ts    — Interface (port) for all data access
RegistrationManager.ts   — Capacity policy, priority dropping, restart recovery
GeofenceEventProcessor.ts — ENTER/EXIT → state transitions, idempotency
LocationService.ts       — getCurrentPosition() + watchPosition() stubs (mock data)
SearchService.ts         — Online search with OfflineError when offline
MapCacheService.ts       — Tile caching (download, check cached areas)
```

### src/native/
```
GeofencingModule.ts      — TypeScript interface for native geofence operations + event listener
GeofenceEventProcessor.ts — Processes native events into state transitions
```

### src/data/
```
SQLiteAdapter.ts         — SQLite CRUD operations
ReminderRepositoryImpl.ts — Implements all repository ports (Reminder, Event, NotificationLog)
```

### src/stores/
```
reminderStore.ts         — Zustand store: CRUD, state machine validation, initial status
```

### src/hooks/
```
useGeofencing.ts         — Wraps native module: register, unregister, events, permissions
useCurrentLocation.ts    — One-shot GPS with loading/error states
useMapPin.ts             — Pin placement, radius clamping (10–500m)
```

### src/ui/
```
MapView.tsx              — Placeholder map (offline indicator, overlay count)
CreateReminderLocationPicker.tsx — GPS/map/search tabs, radius presets, offline banner
```

### src/theme/
```
colors.ts                — Glass Layered palette (light + dark)
typography.ts            — 6 sizes, Inter + IBM Plex Mono
spacing.ts               — 4dp grid (4–48)
radii.ts                 — small 10, input 14, card 20, large 24, pill/modal 28
elevation.ts             — Graphite shadow (blur 18, offset 0,6)
motion.ts                — Motion tokens including durationReduced
ThemeContext.tsx         — ThemeProvider + useTheme() hook, auto dark mode
index.ts                 — Re-exports all tokens and ThemeProvider
```

### src/navigation/
```
AppNavigator.tsx         — Stack + Bottom Tabs navigation shell (placeholder screens)
navigationTypes.ts       — TypeScript route types
```

### src/components/
```
Button.tsx               — Themed button (primary, secondary, text variants)
Input.tsx                — Themed text input with label
Card.tsx                 — Glass card with shadow elevation
Badge.tsx                — Status badge (color-coded by ReminderStatus)
Divider.tsx              — Themed divider line
SafeAreaWrapper.tsx      — Wraps content in SafeAreaView
index.ts                 — Re-exports all components
```

### Tests (src/__tests__/)
```
plan0-setup.test.ts      — 6 setup verification tests (files exist, scripts defined)
theme/tokens.test.ts     — 19 token tests (colors, typography, spacing, radii)
theme/ThemeContext.test.tsx — 2 tests (ThemeProvider renders, useTheme works)
components/Button.test.tsx — 7 button variant tests
models/Reminder.test.ts  — 22 tests (validation, creation, updates)
native/GeofencingModule.test.ts — 11 tests (register, unregister, permissions)
navigation/AppNavigator.test.tsx — 2 tests (render, navigation structure)
services/StateMachine.test.ts — 48 tests (all transitions, haversine, initial status)
services/RegistrationManager.test.ts — 17 tests (capacity policy, lifecycle)
services/LocationService.test.ts — 13 tests (TargetLocation validation, GPS stubs)
services/MapCacheService.test.ts — 15 tests (tile caching CRUD)
services/SearchService.test.ts — 3 tests (online search, offline error)
stores/orchestrationStore.test.ts — 14 tests (event processing, idempotency)
```

---

## Emergency Recovery Notes

### System crash — resume procedure

1. **Identify last completed plan.** Read `docs/superpowers/plans/README.md` for the plan index and current status. Cross-reference with the last committed commit hash (`git log --oneline -1`).
2. **Restore source files.** Run `git checkout <last-plan-commit> -- src/` to restore the working tree to that plan's state.
3. **Restore dependencies.** Run `npm install --legacy-peer-deps`.
4. **Verify baseline.** Run `npx tsc --noEmit` and `npx vitest run`. Confirm tests pass before continuing.
5. **Read the plan document.** Open `docs/superpowers/plans/<plan-number>-<name>.md`. Identify which checklist items are already done (check those in git) vs. what remains.
6. **Drift-check.** Run `git diff <plan-commit>..HEAD -- <affected-paths>` to verify nothing was left behind.
7. **Continue implementation.** Follow the remaining checklist items in order.

**Last completed plan:** Plan 5 (Location Selection & Maps) — commit `3b9c9e3b`.
**Remaining plans:** 6 (Notifications & Recovery), 7 (Core UI Flows), 8 (Advertising), 9 (Paid Themes), 10 (Release Hardening).

### .prompts/ files — what they are and when to reference them

| File | Purpose | When to use |
|---|---|---|
| `gps-reminder-revised-development-prompt.md` | Master product spec + engineering planning prompt. Defines all functional requirements (reminder creation, location selection, geofencing behavior, notification rules), non-functional constraints (offline-first, accessibility, monetization), product decisions (platforms, design system, ad strategy), and the mandatory planning workflow. | **Always.** Reference this when implementing any feature to verify spec coverage, check constraints, or resolve requirement questions. This is the single source of truth for what the app must do. |
| `gps-location-reminder-product-specification.docx` | Original Word-format product specification (pre-revision). Contains the raw feature list and requirements before they were structured into the revised prompt. | Only when a requirement in the revised prompt seems ambiguous or incomplete — cross-check against the original spec for context. |

**Rule:** Always read `gps-reminder-revised-development-prompt.md` fully before starting any new plan. Do not write application code until the plan has been reviewed against this spec and approved.

---

## Quick Start Commands

```bash
# Clone and setup (if starting fresh)
git clone <repo-url>
cd geofence-reminder-mobile-app
npm install --legacy-peer-deps

# Verify everything works (no device needed)
npx tsc --noEmit           # TypeScript check — should have zero errors
npx vitest run             # Run all 179 tests — should all pass
npx eslint src/            # Lint check (no prettier rule)

# Run on device (after Plans 6+7 are done)
npx react-native run-ios --simulator "iPhone 14"
npx react-native run-android --variant=debug

# iOS build (release)
cd ios && pod install && cd ..
xcrun xcodebuild archive -workspace ios/GPSReminder.xcworkspace -scheme GPSReminder -configuration Release -sdk iphoneos

# Android build (release)
cd android && ./gradlew assembleRelease && cd ..
```

## Where to Find Things

- **Spec requirements:** `.prompts/gps-reminder-revised-development-prompt.md`
- **Implementation plans (current + remaining):** `docs/superpowers/plans/06-notifications-recovery.md` through `10-release-hardening.md`
- **Completed plan docs:** `docs/superpowers/plans/00-project-setup.md` through `05-location-selection-maps.md`
- **All source code:** `src/` (mirrors the architecture map above)
- **Native code:** `native-modules/ios/` and `native-modules/android/`
- **Test files:** `src/__tests__/` (mirrors `src/` structure)
- **Design assets:** `assets/icons/`, `assets/backgrounds/`, `assets/screens/`

---

*This handoff was written for a new team member taking over development. All context needed to continue from Plan 6 is contained here. If anything is unclear, cross-reference with the plan documents in `docs/superpowers/plans/` and the spec in `.prompts/gps-reminder-revised-development-prompt.md`.*
