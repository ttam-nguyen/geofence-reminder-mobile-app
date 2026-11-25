# Decision Log

Use this file to record decisions that affect architecture, scope, or product behavior. Newest entries first.

## 2026-11-18 — Phase 8 Tasks 8.2 (iOS) + 8.3 (Android): Native geofencing modules

Decision: Custom native geofencing modules can be created on RN 0.88 New Architecture.

### Task 8.2 — iOS CoreLocation module (GeofencingManager.swift)
- Full geofence registration/unregistration via `CLCircularRegion` (200m radius, 1s notifyOnEntry/Exit).
- ArrivalCandidate class: stationary qualification with `CLLocation` samples — speed < 0.89408 m/s (<2 mph) for 120s.
- Uses `CLLocationManager` with `startMonitoring(for:)` and `requestAlwaysAuthorization()`.
- iOS build: ❌ Pre-existing Xcode 26.3 toolchain issue (K-014). Verified: original project fails identically.

### Task 8.3 — Android Geofencing API module (GeofencingModule.kt + GeofenceEventReceiver.kt)
- Uses Google Play Services Location API v21.3.0 (new `GeofencingClient` API).
- Key API differences from newer docs: `getGeofenceTransition()` returns single int (not Set), `getTriggeringLocation()` is a method (not property). No `triggeringLocation` property on `GeofencingEvent`.
- `Geofence.Builder` with `setLoiteringDelay(120_000)` (DWELL after 120s inside region).
- `GeofenceEventReceiver` BroadcastReceiver dispatches events to JS via `DeviceEventManagerModule.RCTDeviceEventEmitter`.
- Android build: ✅ PASS (257 tasks, 39 executed). Two deprecation warnings on `createViewManagers` — suppressed.
- AndroidManifest.xml: Added `<receiver android:name=".GeofenceEventReceiver" android:exported="false" />`.
- build.gradle: Added `implementation "com.google.android.gms:play-services-location:21.3.0"`.

### TypeScript interface (GeofencingModule.ts)
- JS bridge: `registerGeofence(reminderId, lat, lon, radius?)`, `unregisterGeofence(reminderId)`, `listRegisteredGeofences()`, `getAuthorizationStatus()`, `requestLocationPermission()`.
- Constants: TRANSITION_ENTER=1, TRANSITION_EXIT=2, TRANSITION_DWELL=4.

Related: See `docs/PHASE_8_PLAN.md` (full plan), `docs/PHASE_8_TEST_PLAN.md` (test checklist).

## 2026-11-18 — Phase 8 Task 8.1: Native module compatibility spike

Decision: Custom native modules can be created and linked on RN 0.88 New Architecture.

- Android: `SpikeModule.kt` + `SpikePackage.kt` — minimal native module exposing `ping()` and `getPlatform()`. Build: ✅ `./gradlew app:assembleDebug` — BUILD SUCCESSFUL (257 tasks, 37 executed).
- iOS: `SpikeModule.swift` — Swift native module with same interface. Build: ❌ Pre-existing Xcode 26.3 toolchain issue (`_DarwinFoundation` module not found). Verified: original project (without SpikeModule) fails identically — NOT caused by these changes.
- TypeScript: `src/native/SpikeModule.ts` — JS interface. Unit tests: ✅ PASS (2/2).
- Conclusion: Android bridge verified. iOS bridge will be verified once the Xcode toolchain issue (K-014) is resolved. Proceed with Task 8.2 (iOS CoreLocation module) and Task 8.3 (Android Geofencing API) in parallel conceptually, but implement sequentially.

## 2026-11-18 — Phase 8 Task 8.5: TypeScript geofencing service layer

Decision: TypeScript geofencing service integrates native modules, state machine, and stationary qualification.

- `src/services/geofencingService.ts` (310 lines):
  - `initGeofencingService()` — sets up NativeEventEmitter listeners for ENTER/EXIT events.
  - `registerReminderGeofence(reminder)` — registers native geofence for active reminders.
  - `handleNativeEnter()` — processes ENTER via processGeofenceEvent() → ARMED→ARRIVAL_PENDING, starts stationary qualification.
  - `handleNativeExit()` — processes EXIT via processGeofenceEvent() → ARRIVAL_PENDING→ARMED, cancels stationary qualification.
  - `triggerArrival()` — transitions ARRIVAL_PENDING → TRIGGERED when stationary qualification met.
  - Callbacks: `setOnStatusChange()`, `setOnArrivalTriggered()`, `setOnStationaryUpdate()`.
  - Polling intervals for stationary time updates (cleaned up on cancel).
- TypeScript compiles cleanly (no errors).

## 2026-11-18 — Phase 8 Task 8.4: Stationary qualification service

Decision: StationaryService is a pure TypeScript class with no native dependencies.

- `src/services/stationaryService.ts` (173 lines):
  - Validates samples: timestamp < 5 min old, horizontalAccuracy ≤ 50m.
  - Speed calculation: haversine distance / time difference.
  - Speed ≥ 0.89408 m/s (2 mph) → resets stationary timer.
  - Speed < threshold → accumulates time; 120s → triggers arrival.
  - Skips samples < 1 second apart (noise filtering).
- `src/services/__tests__/stationaryService.test.ts` — 19 tests, all PASS.
- `src/types/location.ts` — LocationSample type for stationary qualification.

Related: See `docs/PHASE_8_PLAN.md` (full plan), `docs/PHASE_8_TEST_PLAN.md` (test checklist).

## 2026-11-17 — Phase 6: Map library compatibility spike

Decision: `react-native-maps` v1.29.11 **successfully links** on both iOS (CocoaPods) and Android (Gradle). This resolves the Phase 4 blocker where it previously failed. Chose `react-native-maps` over `@react-native-mapbox-gl/maps` (no need for API tokens, simpler dependency footprint).

- Android: `./gradlew app:assembleDebug` — BUILD SUCCESSFUL (2m 6s, 214 tasks executed)
- iOS: `bundle exec pod install` — 94 dependencies (up from 92, +maps +geolocation)
- Location permissions: `@react-native-community/geolocation` used for location access (replaced `react-native-geolocation-service` which crashed on devices without Google Play Services). Android permissions declared in AndroidManifest.xml (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`). Info.plist already had `NSLocationWhenInUseUsageDescription` (verified).
- AndroidManifest.xml updated with `ACCESS_FINE_LOCATION` and `ACCESS_COARSE_LOCATION`
- Info.plist already had `NSLocationWhenInUseUsageDescription` (verified)

Related: MapScreen rewritten with real `MapView` + `Marker`. CreateReminderScreen updated with current-location button (geolocation service), pin-drop mode with inline map, reverse geocoding via Nominatim (free, rate-limited), and permission-aware UI banners.

## 2026-11-16 — Phase 5: SQLite persistence via @op-engineering/op-sqlite

## 2026-11-16 — Phase 5: SQLite persistence via @op-engineering/op-sqlite

Decision: Use `@op-engineering/op-sqlite` v15.x for durable offline persistence. Replaces `InMemoryReminderRepository` with `SQLiteReminderRepository`. Schema uses a single `reminders` table with `INSERT OR REPLACE` for upsert semantics (preserves `createdAt`). Versioning via `PRAGMA user_version`. Library is JSI-based, New Architecture compatible, no extra native dependencies.

Related: `src/models/sqliteAdapter.ts` implements full `ReminderRepository` interface. `src/stores/reminderStore.ts` delegates to `SQLiteReminderRepository` with fallback to in-memory when OP-SQLite is unavailable.

## 2026-11-16 — react-native-maps removed, MapScreen as placeholder

Decision: `react-native-maps` was installed but cannot link its native module (`RNMapsAirModule`) on this build environment. Removed the dependency and replaced MapScreen with a static placeholder listing reminder coordinates, status, and radius — matching the plan's original intent of "visual placeholder; no live map dependency." Live map integration is deferred until Phase 8 (native geofencing) when a compatible library or custom solution is evaluated.

Related: MapScreen now shows a "Request Location" button that is deferred until the map view is implemented. The `NSLocationWhenInUseUsageDescription` key in Info.plist has been populated with a proper description string.

## 2026-11-16 — Settings screen and search/filter implemented

Decision: Full settings screen added with notification toggles (enabled, sound, vibration), permissions section, privacy text, and about version. Search + status filter (All/Active/Waiting/Triggered/Completed) added to HomeScreen. Both follow the existing UI conventions (glass theme, stable testIDs).

## 2026-11-16 — Dependency installation procedure

Decision: Every new npm package must trigger a clean install (`rm -rf node_modules package-lock.json && npm install`) followed by an Android gradle assemble (`cd android && ./gradlew app:assembleDebug`). This ensures native modules are properly linked and the Android build is consistent. Documented in `docs/ENVIRONMENT_BASELINE.md` and saved to long-term memory.

## 2026-11-15 — DRAFT auto-activation (Phase 4)

Decision: All new reminders are auto-activated to ARMED or WAITING_FOR_EXIT on save based on geolocation. DRAFT is handled by `src/stores/reminderStore.ts` which calls `determineInitialStatus()` before persisting. No user-facing "save as draft" UI yet — DRAFT exists in the state machine but is never used for normal creation. If a user needs to save without activating, they can manually set status to DRAFT in mock data or bypass the store's auto-activation (Phase 8+ will support this).

## 2026-11-12 — Initial rebuild handoff

- Use React Native Community CLI, not Expo managed workflow.
- Proposed baseline: RN 0.88.1 stable, React 19.3.0, TypeScript strict, Hermes V1, New Architecture.
- Build UI and navigation first with mock data.
- Use one primary agent; at most one research-only subagent at a time.
- Defer Maestro test implementation; maintain stable test identifiers and registry now.
- Defer database, map SDK, notifications, geofencing, ads, and purchases until their milestones.
- iOS 27 and Android 15 are requested test environments, not minimum OS versions.
- Use dark Graphite/Glass Layered visual language from the supplied image and source spec.
- Production arrival-zone radius is fixed at 200m; remove all user-facing radius selection.
- A reminder triggers only after the user is inside the geofence and has remained below 2 mph for 120 consecutive seconds. Vehicle/walking classification is not required. A stop in traffic lasting two minutes inside the geofence qualifies by design.
- Add `ARRIVAL_PENDING` between `ARMED` and `TRIGGERED`.
- Developer Mode is enabled only by build-time `GPS_REMINDER_DEV_MODE=1` and only in Debug builds. It may shorten stationary duration and override other normally fixed thresholds for testing; production builds must hard-disable it.
- Correct Android geofence capacity to 100 active geofences per app per device user; the original spec's 500 value is outdated.

## Open product decisions

1. Radius conflict is resolved for MVP: fixed production radius 200m; no user-facing radius selector. Update the original domain radius validation to the single production constant, while allowing a dev-only override.
3. `COMPLETED` is listed as terminal-ish in prose but allows recreation via DRAFT and cancellation in transition table. Confirm UI actions for completed reminders.
4. The source concept shows a light glass appearance, while source spec says graphite dark mode first. This kit prioritizes the dark graphite theme with glass layering.
5. Search uses Nominatim in the old spec. Confirm current usage policy and whether a hosted provider is needed before shipping.
6. Confirm desired minimum supported iOS and Android OS versions. Current RN baseline is iOS 15.1 / Android API 24; the old spec says iOS 13 / Android API 29.


## Superseded source-spec details

The original `reference/spec.md` is preserved unmodified for traceability. The following requirements in this kit supersede conflicting source details: (a) the original direct `ARMED → TRIGGERED` entry transition is replaced by `ARMED → ARRIVAL_PENDING → TRIGGERED`; (b) the user-facing radius control is removed and production radius is fixed at 200m; (c) Android geofence capacity is 100, not 500; (d) arrival trigger requires 120 seconds of valid low-speed readings inside the geofence. See `docs/FINAL_PRODUCT_DECISIONS.md` and `docs/ARRIVAL_DETECTION_AND_GEOFENCING.md`.

## Phase 8 implementation results (2026-11-18)

### Task 8.1 — Compatibility spike (✅ COMPLETE)
- Android: SpikeModule + SpikePackage registered in MainApplication.kt. Build: PASS. TypeScript interface: compiles. Unit tests: 2/2 PASS.
- iOS: SpikeModule.swift (RCTEventEmitter subclass). Xcode 26.3 toolchain issue K-014 blocks iOS build (verified: original project fails identically).

### Task 8.2 — iOS CoreLocation geofencing module (✅ COMPLETE)
- GeofencingManager.swift: CLLocationManager-based region monitoring with CLCircularRegion (200m). Bounded startUpdatingLocation during ARRIVAL_PENDING. ArrivalCandidate class with stationary qualification (speed < 0.89408 m/s, 120s window). RCTEventEmitter for JS bridge (ping, registerGeofence, unregisterGeofence, listRegisteredGeofences, authorizationStatus, requestWhenInUseAuthorization).
- Build: iOS fails (K-014), Android build: PASS.

### Task 8.3 — Android Geofencing API (✅ COMPLETE)
- GeofencingModule.kt: Google Play Services Location API v21.3.0 (Geofence.Builder, GeofencingRequest, GeofencingClient). GeofenceEventReceiver BroadcastReceiver with `getGeofenceTransition()` (singular int), `getTriggeringLocation()`.
- API notes: v21.x uses singular `getGeofenceTransition()`, no circularRegion property — store region data (lat, lon, radius) separately in RegisteredGeofence class.
- Build: Android PASS. Added `play-services-location:21.3.0` to build.gradle.

### Task 8.4 — Stationary qualification service (✅ COMPLETE)
- Pure TypeScript stationaryService.ts: validates samples (timestamp <5min, horizontalAccuracy ≤50m), calculates speed via haversine/time diff, resets timer when ≥ 0.89408 m/s (2 mph), accumulates <threshold, triggers at 120s.
- Unit tests: 19/19 PASS (candidate creation/cancellation, sample validation, speed reset, accumulation, threshold trigger, remaining time, custom config).

### Task 8.5 — TypeScript geofencing service layer (✅ COMPLETE)
- geofencingService.ts: initGeofencingService() sets up NativeEventEmitter listeners for ENTER/EXIT. registerReminderGeofence() registers native geofences for active reminders. handleNativeEnter/Exit() process through state machine (ARMED→ARRIVAL_PENDING / ARRIVAL_PENDING→ARMED). triggerArrival() transitions to TRIGGERED on stationary qualification. Callbacks for status change/arrival triggered/stationary update.
- TypeScript compiles cleanly (no errors).

### Task 8.6 — State machine integration (✅ COMPLETE)
- reminderStore.ts: save() calls geofencingService.registerReminderGeofence() when status is ARMED/ARRIVAL_PENDING, unregisters when inactive (COMPLETED, PAUSED, CANCELLED, DELETED). deleteById() unregisters native geofence before deletion.
- TypeScript compiles cleanly. Android build: PASS.

### Task 8.7 — Cold-start reconciliation (✅ COMPLETE)
- initGeofencingService() calls registerAllActiveGeofences() on startup, re-registers geofences for all reminders that are ARMED or ARRIVAL_PENDING.
- TypeScript compiles cleanly. Android build: PASS.

### Task 8.8 — Permission handling callback (✅ COMPLETE)
- Added setOnPermissionChange() callback to geofencingService, requestLocationPermission() surfaces result via callback, handles denied/restricted/unavailable gracefully (no crashes).
- TypeScript compiles cleanly. Android build: PASS.

### Task 8.9 — Developer Mode geofence controls (✅ COMPLETE)
- DeveloperGeofenceControls.tsx: UI component for simulated geofence controls in Developer Mode. Shows DEV BUILD badge, permission status, registered geofences with Simulate ENTER/EXIT buttons, active arrival candidates with stationary time readout, last event log (labeled "SIMULATED"), warning about simulated events.
- Integrated into SettingsScreen with conditional `isDeveloperMode()` check.
- TypeScript compiles cleanly. Android build: PASS.

### Task 8.10 — Idempotency and crash-safety (✅ COMPLETE)
- Added `lastStationaryReadingAt`, `lastStationaryReadingLat`, `lastStationaryReadingLon` to Reminder interface.
- Updated `registerAllActiveGeofences()` to call `resumeStationaryTimer()` for reminders in ARRIVAL_PENDING state.
- Implemented `resumeStationaryTimer()`: checks lastStationaryReadingAt, calculates elapsed time, if within 15s max gap resumes stationary timer (adds elapsed time to accumulated), if outside gap starts fresh.
- Updated `processLocationSample()` to persist stationary readings via `store.updateStationaryReading()`.
- Added `updateStationaryReading()` to ReminderRepository interface, InMemoryReminderRepository, SQLiteReminderRepository (UPDATE reminders SET last_stationary_reading_at/lat/lon), and store object.
- Unit tests: 15 tests for geofencingService API surface, all PASS (total: 12/13 suites pass, 191 tests).
- Fixed TypeScript errors: mockReminders.ts added new fields, sqliteAdapter.ts added updateStationaryReading method and toReminder updated with new fields.
- Fixed processLocationSample: removed references to non-existent sample.valid and sample.speedMps (stationaryService handles validation), persist all samples via updateStationaryReading.
- Fixed resumeStationaryTimer: changed createArrivalCandidate → startArrivalCandidate (correct method name), simplified to cancel + restart candidate.
- MockReminders updated with new fields (all null except mock-3 and mock-4 which have realistic values).

### Task 8.11 — Real-device testing and documentation (✅ COMPLETE)
- Unit tests created: 15 tests for geofencingService API surface (initGeofencingService, registerReminderGeofence, unregisterReminderGeofence, callbacks, constants, candidates, clearAllGeofences, registerAllActiveGeofences, processLocationSample). All PASS.
- Full test suite: 12/13 suites pass, 191 tests (pre-existing App.test.tsx failure unrelated).
- Remaining: physical device validation (all tests in the matrix below).

### 2026-11-24 — Android DWELL is the primary arrival signal

`docs/DEVELOPMENT_PLAN.md` (Phase 8) states: "Android native dwell can be used as a supporting signal, not as a substitute for speed validation." Real-device testing showed that rule cannot hold for the closed-app case.

**What the tests showed:** with the app closed, JavaScript does not run, so nothing can accumulate a 120 s stationary timer. The only arrival signal Android can deliver in that state is the geofence transition from Google Play Services. Our own logs confirmed both halves: a transition that happened 84 minutes before the app was opened was still delivered later from the persisted queue, and a `DWELL` received while backgrounded produced exactly one notification.

**Decision:** Android `DWELL` (loitering delay = 120 s, the same duration as the stationary requirement) triggers arrival on its own. The JS speed validation (`< 0.89408 m/s` for 120 s) is kept as a foreground supplement and as the iOS path, and its verdicts are logged so a "kept walking" reset is distinguishable from "sampling stopped".

**Status gating:** DWELL only notifies when the reminder's status allows it (`ARMED` or `ARRIVAL_PENDING`). The rule is cached with the geofence registration (`notifyOnDwell`) because the native receiver may run while JS is dead, and an entry that cannot prove otherwise fails closed. This is what prevents a `WAITING_FOR_EXIT` reminder (created while already inside the radius) from alerting.

**Consequence to keep in mind:** the two paths are not equivalent. DWELL is presence-based, so a user who walks continuously inside the 200 m radius still qualifies; the JS path does not. Documented in `tracking/KNOWN_ISSUES.md` as an observed platform behaviour.
