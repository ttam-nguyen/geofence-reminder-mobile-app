# Phase 8 — Native Geofencing

**Goal:** Implement the actual location-triggered reminder lifecycle, including 200m geofence registration and 120-second stationary qualification.

**Start condition:** Gate 7 passes (local notifications schedule/deliver/cancel on real iOS and Android devices).

**Duration estimate:** 10–20 days on physical devices (platform limits, background policies, and stationary qualification timing add high variance).

---

## 1. What Phase 7 left us with

| Area | Status | Files |
|---|---|---|
| Navigation shell (bottom tabs + stack) | ✅ Complete | `src/navigation/AppNavigator.tsx` |
| All 7 screens (Home, Map, Settings, CreateReminder, Detail, ReminderDetail, Onboarding) | ✅ Complete with mock data | `src/screens/*.tsx` |
| State machine (9 states, 25 transitions) | ✅ Complete | `src/models/stateMachine.ts` |
| Domain model (validation, haversine) | ✅ Complete | `src/models/validation.ts`, `haversine.ts` |
| Geofence event processor (ENTER/EXIT → transitions) | ✅ Complete | `src/models/eventProcessor.ts` |
| Arrival verification config (injectable defaults) | ✅ Complete | `src/models/arrivalConfig.ts` |
| SQLite persistence (OP-SQLite) | ✅ Complete | `src/models/sqliteAdapter.ts` |
| Map with real react-native-maps + markers | ✅ Complete | `src/screens/MapScreen.tsx` |
| Location permissions via @react-native-community/geolocation | ✅ Complete (foreground only) | AndroidManifest.xml, Info.plist entries |
| ReminderRepository interface + InMemory/SQLite adapters | ✅ Complete | `src/models/repository.ts`, `sqliteAdapter.ts` |
| Reminder store with notification scheduling for ARMED/ARRIVAL_PENDING | ✅ Partial | `src/stores/reminderStore.ts` (schedules notifications but no geofence lifecycle) |
| Zustand stores (reminderStore, settingsStore) | ✅ Complete | `src/stores/reminderStore.ts`, `settingsStore.ts` |
| Theme tokens (Graphite/Glass) | ✅ Complete | `src/theme/index.ts` |
| Local notifications via @notifee/react-native v9.1.8 | ✅ Complete | `src/services/notificationService.ts` |
| Developer Mode spec (build-gated) | ✅ Spec only | `docs/DEVELOPER_MODE.md` |

**Gap:** No native geofencing code exists on either platform. No `GeofencingModule` TypeScript interface, no iOS CoreLocation region monitoring, no Android Geofencing API integration. The state machine and event processor are ready but have no native event source feeding them.

---

## 2. Library decision: custom native modules

### Candidate evaluation

| Criterion | Custom native modules (CoreLocation + Geofencing API) | Third-party RN geofencing library |
|---|---|---|
| RN 0.88 compatibility | Full control; must handle New Architecture bridging ourselves | Most third-party libraries lag RN 0.88 support by months |
| License | N/A (in-house) | Varies; many are MIT but abandoned |
| Feature set | Full control: register/unregister/list/reconcile, ENTER/EXIT/DWELL events, foreground+background | Limited by library API; many lack background support on Android OEMs |
| Maintenance | Owned in-app; no external dependency risk | High churn rate in this space (react-native-background-geolocation, react-native-geofencing often stale) |
| Compatibility risk | Medium — must handle New Architecture native module bridging | High — most libraries target RN 0.7x, not 0.88 New Architecture |
| Time to implement | ~5–7 days spike + 8–13 days implementation | ~2–3 days setup + 5–7 days integration (but limited features) |

**Decision:** Build custom native modules. The spec requires precise control over stationary qualification (speed < 2 mph for 120s), idempotent event handling, platform-specific capacity limits (iOS 20 / Android 100), reboot recovery, and a developer-mode simulation UI. Third-party libraries in this space are frequently abandoned, lack RN 0.88 New Architecture support, and cannot be customized for the stationary qualification logic that is the core of this product.

### Platform-specific approach

**iOS:**
- `CoreLocation` framework: `CLCircularRegion` for 200m geofence registration.
- Region monitoring for outer boundary (ENTER/EXIT events).
- Bounded `startUpdatingLocation` during `ARRIVAL_PENDING` for speed sampling.
- Stop high-accuracy updates as soon as the candidate is confirmed, cancelled, or times out.

**Android:**
- Google Play Services `GeofencingApi` with `PendingIntent` / `BroadcastReceiver`.
- `Geofence` objects (200m radius, `GEOFENCE_TRANSITION_ENTER | GEOFENCE_TRANSITION_EXIT`).
- `Location` callback during `ARRIVAL_PENDING` for speed sampling (separate from geofence events).
- Optional: `GEOFENCE_TRANSITION_DWELL` as supporting signal only (not a replacement for speed validation).

---

## 3. Files to create and modify

### New files (TypeScript layer)

```
src/native/
  GeofencingModule.ts             # TypeScript interface for native geofence operations
  GeofencingEventEmitter.ts       # Native event emitter bridge (ENTER/EXIT/location events)
  GeofenceEventProcessor.ts       # Consumes native events → state machine transitions

src/services/
  geofencingService.ts            # Public TypeScript API: register, unregister, list, reconcile, subscribe
  geofencingService.test.ts       # Unit tests (mocked native module)

src/hooks/
  useGeofencing.ts                # React hook: subscribe to geofence events, manage lifecycle

src/components/
  GeofenceStatusBadge.tsx         # Visual indicator for geofence status (ARMED, ARRIVAL_PENDING, TRIGGERED)
  DeveloperGeofenceControls.tsx   # Dev-mode UI: simulate ENTER/EXIT, show diagnostic readout (Phase 8.9)
```

### New files (Native — iOS)

```
ios/GPSReminder/GeofencingManager.swift        # CoreLocation region monitoring + bounded location updates
ios/GPSReminder/GeofencingManager+Regions.swift  # Register/unregister/list/reconcile logic
ios/GPSReminder/GeofencingManager+Arrival.swift  # Stationary qualification (speed < 2 mph for 120s)
```

### New files (Native — Android)

```
android/app/src/main/java/com/gpsreminder/GeofencingModule.kt       # Main native module (register/unregister/list)
android/app/src/main/java/com/gpsreminder/GeofencingReceiver.kt     # BroadcastReceiver for geofence events
android/app/src/main/java/com/gpsreminder/LocationCallbackWrapper.kt  # Bounded location updates for stationary qualification
```

### New files (Native — Bridge setup)

```
ios/GPSReminder/GeofencingManager+Bridge.swift  # RCTEventEmitter / TurboModule bridge
android/app/src/main/java/com/gpsreminder/GeofencingPackage.kt  # NativeModules registration
```

### Modified files

```
package.json                          # Add react-native-maps (verify; already installed), possibly Google Play Services dependency declaration
android/app/src/main/AndroidManifest.xml  # Add FOREGROUND_SERVICE_LOCATION, ACCESS_FINE_LOCATION (if not present), INTERNET (for Play Services)
ios/GPSReminder/Info.plist            # Add NSLocationWhenInUseUsageDescription (if not present), NSLocationAlwaysAndWhenInUseUsageDescription for background
src/screens/MapScreen.tsx             # Wire geofence status to map markers (color-coded per state machine)
src/screens/SettingsScreen.tsx        # Add Developer Tools row + geofence diagnostic panel (Phase 8.9)
src/stores/reminderStore.ts           # Integrate geofencingService: register on save(ARMED), unregister on TRIGGERED/COMPLETED/CANCELLED
src/models/stateMachine.ts            # (no change needed — already has ARRIVAL_PENDING, TRIGGERED)
tracking/INTERACTION_REGISTRY.md      # Add geofence-related testIDs (GeofenceStatusBadge, DeveloperControls)
tracking/KNOWN_ISSUES.md              # Add new geofencing issues as discovered during testing
```

---

## 4. Step-by-step tasks

### Task 8.1 — Compatibility spike: native module bridging on RN 0.88 New Architecture (1 day)

**Goal:** Verify that custom native modules can be created and linked on RN 0.88 New Architecture (Fabric).

Steps:
1. Create a minimal native module stub on both platforms (one method: `ping()` → returns `"ok"`).
2. Verify TypeScript interface compiles and calls into native code.
3. Verify event emission from native to JS works (a simple periodic timer event).
4. Record results in `docs/DECISIONS.md`.

**Gate 8.1:** ✅ Both platforms build, JS calls native `ping()` and receives a response. Event emission from native to JS works.

### Task 8.2 — iOS native geofencing module (CoreLocation) (2–3 days)

**Status: COMPLETED ✅**

**Files created:**
- `ios/GPSReminder/GeofencingManager.swift` (305 lines)
  - `ping()` → returns "ok"
  - `registerGeofence(reminderId, lat, lon, radius: Double?)` — CLCircularRegion (200m default)
  - `unregisterGeofence(reminderId)`
  - `listRegisteredGeofences()` → JSON array
  - `getAuthorizationStatus()` → string
  - `requestWhenInUseAuthorization()`
- CLLocationManagerDelegate: didEnterRegion, didExitRegion, didUpdateLocations
- ArrivalCandidate class (stationary qualification helper)

**Gate 8.2:** ✅ Android build: PASS (257 tasks, 39 executed). ❌ iOS build: FAIL — pre-existing Xcode 26.3 toolchain issue (K-014). Verified: original project fails identically.

### Task 8.3 — Android native geofencing module (Geofencing API) (2–3 days)

**Status: COMPLETED ✅**

**Files created:**
- `android/app/src/main/java/com/gpsreminder/GeofencingModule.kt` (238 lines)
  - `registerGeofence(reminderId, latitude, longitude, radius)`
  - `unregisterGeofence(reminderId)`
  - `listRegisteredGeofences()` → JSON array
  - `getAuthorizationStatus()`, `requestLocationPermission()`
- `android/app/src/main/java/com/gpsreminder/GeofenceEventReceiver.kt` (138 lines)
  - BroadcastReceiver for geofence transitions
  - Emits events to JS via DeviceEventManagerModule.RCTDeviceEventEmitter
- `android/app/src/main/java/com/gpsreminder/GeofencingPackage.kt` (18 lines)
- `android/app/src/main/java/com/gpsreminder/MainApplication.kt` (updated: add GeofencingPackage)
- `android/app/src/main/AndroidManifest.xml` (updated: added GeofenceEventReceiver)
- `android/app/build.gradle` (updated: play-services-location 21.3.0)
- `src/native/GeofencingModule.ts` (JS bridge interface)

**Key API notes:** Google Play Services Location v21.x — `getGeofenceTransition()` returns single int (not Set), `getTriggeringLocation()` is a method (not property). No `triggeringLocation` property on GeofencingEvent.

**Gate 8.3:** ✅ Android build: PASS (257 tasks, 39 executed).

### Task 8.4 — Stationary qualification: bounded location updates for speed (2–3 days)

**Status: COMPLETED ✅**

**Files created:**
- `src/services/stationaryService.ts` (173 lines)
  - StationaryService class with `startArrivalCandidate()`, `cancelArrivalCandidate()`, `processLocationSample()`
  - Validates samples: timestamp < 5 min old, horizontalAccuracy ≤ 50m
  - Speed calculation: haversine distance / time difference
  - Speed ≥ 0.89408 m/s (2 mph) → resets stationary timer
  - Speed < threshold → accumulates time; 120s → triggers arrival
  - Skips samples < 1 second apart (noise filtering)
- `src/services/__tests__/stationaryService.test.ts` (19 tests, all PASS)
  - Tests: candidate creation/cancellation, sample validation (old/inaccurate/null), speed reset, accumulation, threshold trigger, remaining time, custom config
- `src/types/location.ts` — LocationSample type for stationary qualification

**Gate 8.4:** ✅ TypeScript compiles cleanly. Unit tests: 19/19 PASS.

### Task 8.5 — TypeScript geofencing service layer (1–2 days)

**Status: COMPLETED ✅**

**Files created:**
- `src/services/geofencingService.ts` (310 lines)
  - Full TypeScript service layer wrapping native modules
  - `initGeofencingService()` — sets up NativeEventEmitter listeners for ENTER/EXIT
  - `registerReminderGeofence(reminder)` — registers native geofence for active reminders
  - `unregisterReminderGeofence(reminderId)` — unregisters when status becomes inactive
  - `registerAllActiveGeofences()` — cold-start re-registration
  - `listRegisteredGeofences()`, `getAuthorizationStatus()`, `requestLocationPermission()`
  - `handleNativeEnter()` — processes ENTER via processGeofenceEvent() → ARMED→ARRIVAL_PENDING, starts stationary qualification
  - `handleNativeExit()` — processes EXIT via processGeofenceEvent() → ARRIVAL_PENDING→ARMED, cancels stationary qualification
  - `processLocationSample()` — delegates to StationaryService for arrival detection
  - `triggerArrival()` — transitions ARRIVAL_PENDING → TRIGGERED when stationary qualification met
  - Callbacks: `setOnStatusChange()`, `setOnArrivalTriggered()`, `setOnStationaryUpdate()`
  - Polling intervals for stationary time updates (cleaned up on cancel)
- TypeScript compiles cleanly (no errors).
  reminderId: string;
  **Gate 8.5:** ✅ TypeScript compiles cleanly. No errors.

### Task 8.6 — Integration with reminderStore and state machine (1–2 days)

**Goal:** Wire native geofence events to the existing state machine and reminder store.

Integration points:
- `reminderStore.save()` (new reminder in `ARMED` status) → calls `geofencingService.registerGeofence()`.
- `reminderStore.save()` (reminder in `WAITING_FOR_EXIT` status) → do NOT register geofence; wait for EXIT.
- On geofence ENTER event → state machine: `ARMED → ARRIVAL_PENDING`. Start bounded location updates (Task 8.4).
- On geofence EXIT event → state machine: `ARRIVAL_PENDING → ARMED` (cancel candidate). Stop bounded location updates.
- On 120s stationary qualification → state machine: `ARRIVAL_PENDING → TRIGGERED`. Stop all updates. Unregister geofence. Schedule notification via `notificationService.displayNotification()`.
- On cancel/delete/pause → state machine: cancel geofence registration, unregister from native module.
- On app launch → reconcile registered geofences with persisted reminders (re-register any that are `ARMED` or `ARRIVAL_PENDING`).

**Gate 8.6:** ✅ TypeScript compiles cleanly. State machine transitions triggered by native events in unit tests (mocked).

### Task 8.7 — Reconciliation and recovery on app launch (1 day)

**Goal:** After a cold start, re-register geofences for reminders that are `ARMED` or `ARRIVAL_PENDING`.

Steps:
1. On app launch, load all reminders from SQLite.
2. For each reminder with status `ARMED` or `ARRIVAL_PENDING`, call `geofencingService.registerGeofence()`.
3. For reminders with status `TRIGGERED`, `COMPLETED`, `CANCELLED`, `DELETED`, `PAUSED` — do NOT re-register.
4. Handle capacity overflow: if registered geofences exceed platform limits (iOS 20, Android 100), prioritize `ARMED` over `WAITING_FOR_EXIT`.
5. Surface capacity warnings in the UI (Settings → Developer Tools in dev builds, or a non-blocking banner).

**Gate 8.7:** ✅ Cold-start re-registers geofences correctly. Capacity overflow handled gracefully.

### Task 8.8 — Permission handling and error states (1 day)

**Goal:** Handle location permission revocation, denied state, and unavailable platforms.

Implementation:
- Request `ACCESS_FINE_LOCATION` (Android) / `whenInUse` or `always` location permission (iOS) before registering geofences.
- If permission is denied: do NOT attempt to register geofences. Show a clear status in the UI (e.g., "Location access required for reminders").
- If permission is revoked after registration: stop all geofence monitoring, return affected reminders to `ARMED` (or `DRAFT` if they were `WAITING_FOR_EXIT`).
- If location services are disabled (not just denied): show a non-crashing UI message with a link to open OS settings.
- Android: handle Google Play Services unavailable — report gracefully, do not crash.

**Gate 8.8:** ✅ Permission denied/restricted/unavailable states handled gracefully on both platforms. No crashes.

### Task 8.9 — Developer Mode geofence controls (1–2 days)

**Goal:** When `GPS_REMULER_DEV_MODE=1` is set, expose a Developer Tools panel with geofence simulation and diagnostics.

Implementation (per `docs/DEVELOPER_MODE.md`):
- Settings screen shows a `Developer Tools` row (visible only in dev builds).
- Developer Tools panel includes:
  - `DEV BUILD — TEST VALUES ONLY` label.
  - Current effective config summary (stationary duration, geofence radius, speed threshold).
  - Simulate ENTER button (clearly labeled `SIMULATED EVENT`).
  - Simulate EXIT button (clearly labeled `SIMULATED EVENT`).
  - Diagnostic readout: last native event, current state, last valid speed, speed accuracy, horizontal accuracy, stationary time accumulated.
  - Sliders for dev-only overrides: stationary duration, geofence radius, speed threshold, max sample gap, max horizontal accuracy.
  - Reset-to-dev-defaults button.
- Simulated events must be labeled and NOT satisfy physical-device acceptance criteria.

**Gate 8.9:** ✅ Developer Tools visible in dev builds, absent in release builds. Simulated events clearly labeled.

### Task 8.10 — Idempotency and crash-safety (1 day)

**Goal:** Ensure exactly one notification per reminder, even with duplicate events or process interruptions.

Implementation:
- Only one `ARRIVAL_PENDING → TRIGGERED` transition per reminder (enforced by state machine — already validated in Phase 4).
- Persist the `TRIGGERED` transition and event timestamp to SQLite atomically with notification scheduling.
- Duplicate ENTER, EXIT, or location callbacks must not produce duplicate notifications (enforced by state machine: `TRIGGERED` is terminal).
- If the app process is interrupted during stationary qualification: on recovery, re-register geofences but do NOT count unknown elapsed time as stationary. Resume the stationary timer from the last persisted valid reading (if within max sample gap).

**Gate 8.10:** ✅ Duplicate events produce at most one notification. Process interruption recovers conservatively.

### Task 8.11 — Real-device testing and documentation (3–5 days)

**Goal:** Validate geofence behavior on physical iOS and Android devices.

Test matrix:
| Test | iOS real device | Android real device |
|---|---|---|
| Create reminder: geofence registered (visible in map markers) | ✅ | ✅ |
| Enter geofence at 25 mph, drive through: no notification | ✅ | ✅ |
| Enter geofence at 25 mph, stop for 120s (traffic light scenario): notification | ✅ | ✅ |
| Enter geofence, park, stay under 2 mph for 120s: notification | ✅ | ✅ |
| Walk into geofence, remain under threshold for 120s: notification | ✅ | ✅ |
| Speed ≥ 2 mph during stationary window: timer resets, reminder stays `ARRIVAL_PENDING` | ✅ | ✅ |
| Exit geofence before 120s: return to `ARMED`, no notification | ✅ | ✅ |
| Duplicate ENTER/DWELL/location events: at most one notification | ✅ | ✅ |
| App process interrupted during qualification: recover persisted state conservatively | ✅ | ✅ |
| Permission revoked: stop monitoring, surface clear status | ✅ | ✅ |
| OS delays callbacks: notification may be late but eventually fires correctly | ✅ | ✅ |
| Capacity overflow (20+ iOS / 100+ Android): prioritize ARMED, show warning | ✅ | ✅ |
| Cold start: re-register geofences for active reminders | ✅ | ✅ |

**Gate 8.11:** ✅ All real-device tests pass (or failures are documented with known-limitations rationale). Simulator success alone is insufficient.

---

## 5. Testing strategy

### Unit tests (mocked native module)

`src/services/geofencingService.test.ts`:
- `registerGeofence()` calls the correct native method with proper parameters.
- `unregisterGeofence()` removes the geofence from the native module.
- `listRegisteredGeofences()` returns registered geofences with correct metadata.
- Event subscription/unsubscription works correctly.
- Error handling: native module unavailable, permission denied → graceful fallback, no crash.

`src/hooks/useGeofencing.test.ts`:
- Subscribes to events and dispatches state machine transitions.
- Unsubscribes on unmount (React cleanup).

### Integration tests (state machine + event processor)

`src/models/__tests__/geofenceIntegration.test.ts`:
- Mock native events → verify state machine transitions through `ARRIVAL_PENDING` to `TRIGGERED`.
- Verify duplicate events do not produce duplicate notifications.
- Verify stationary timer resets on speed ≥ 2 mph.
- Verify stationary timer pauses (does not advance) on missing/invalid speed.

### Real-device tests

See Task 8.11 test matrix above. All must run on physical devices — simulators/emulators are insufficient for background geofence validation.

### Simulator notes

- iOS Simulator: location can be simulated via Xcode's Debug → Location menu. Acceptable for early foreground testing only.
- Android Emulator: location can be simulated via extended controls. Acceptable for early foreground testing only.
- **Gate 8 requires real devices.** Simulator success alone does not pass Gate 8.

---

## 6. Integration points with existing code

### With reminderStore (`src/stores/reminderStore.ts`)

```typescript
import { geofencingService } from '../services/geofencingService';

async function save(reminder: Reminder): Promise<Reminder> {
  const result = await repository.save(reminder);

  // If the reminder is ARMED, register its geofence.
  if (result.status === ReminderStatus.ARMED) {
    await geofencingService.registerGeofence(
      result.id, result.latitude, result.longitude
    );
  }

  // If the reminder is no longer active, unregister its geofence.
  if (isInactiveStatus(result.status)) {
    await geofencingService.unregisterGeofence(result.id);
  }

  return result;
}
```

### With state machine (`src/models/stateMachine.ts`)

The event processor (Phase 4) already maps geofence events to state transitions. The new code feeds those events:

```typescript
// In geofencingService event listener:
function handleGeofenceEvent(event: GeofenceEvent) {
  if (event.type === 'ENTER') {
    transitionReminderToArrivalPending(event.reminderId);
  } else if (event.type === 'EXIT') {
    transitionReminderToArmed(event.reminderId);
  }
}
```

### With stationary qualification (Task 8.4)

Bounded location updates during `ARRIVAL_PENDING`:

```typescript
// In stationaryQualificationService:
function onLocationUpdate(location: Location) {
  if (isInsideGeofence(reminderId, location)) {
    if (speedBelowThreshold(location.speed)) {
      stationaryTimer.advance();
    } else {
      stationaryTimer.reset();
    }

    if (stationaryTimer.isComplete()) {
      transitionReminderToTriggered(reminderId);
    }
  }
}
```

### With notificationService (`src/services/notificationService.ts`)

On `TRIGGERED`, schedule a notification:

```typescript
// In reminderStore transition handler:
if (newStatus === ReminderStatus.TRIGGERED) {
  await notificationService.displayNotification({
    title: `Reminder triggered: ${reminder.title}`,
    body: reminder.description || 'You have reached your destination.',
    data: { reminderId: reminder.id },
  });
}
```

### With MapScreen (`src/screens/MapScreen.tsx`)

Color-code markers by state machine status (already partially implemented in Phase 6). Ensure `ARRIVAL_PENDING` and `TRIGGERED` statuses have distinct colors.

---

## 7. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| RN 0.88 New Architecture: custom native modules fail to link or crash | Medium (but non-zero) | Spike Task 8.1 validates this early. Fallback: use `react-native-geolocation-service` as a bridge to native location APIs if TurboModule bridging fails. |
| iOS background geofence callbacks are unreliable or delayed | High (OS-dependent) | Document as known limitation. Test on real devices. Accept late delivery as per product spec. |
| Android OEM background restrictions (MIUI, EMUI, etc.) kill geofence monitoring | High on some devices | Document per-device-observed behavior. Add instructions for users to whitelist the app in battery settings. No fix possible in MVP — mark as known limitation. |
| Google Play Services unavailable on some Android devices (e.g., Huawei) | Medium | Report gracefully to JS layer. Do not crash. Show a non-crashing UI message. |
| Stationary qualification: GPS speed readings are noisy/unreliable at low speeds | Medium (device-dependent) | Use conservative accuracy estimates. If uncertainty makes it impossible to establish speed < 2 mph, treat the sample as indeterminate (pause, do not reset). Tune max sample gap in physical-device testing. |
| iOS 20-region limit reached quickly with many reminders | Medium (user behavior) | Implement priority policy: prioritize `ARMED` over `WAITING_FOR_EXIT`. Show capacity warning in UI. Document as a known limitation for Gate 8. |
| Android 100-geofence limit | Low (most users have fewer reminders) | Implement priority policy. Document as a known limitation for Gate 8. |
| Developer Mode not properly gated in release builds | Low (if implemented carefully) | Automated release-build test: verify Developer Tools route is absent in release builds. Native layer must fail closed regardless of shell environment. |
| Bounded location updates drain battery during `ARRIVAL_PENDING` | Medium (120s window) | Stop high-accuracy updates as soon as the candidate is confirmed, cancelled, or times out. 120-second window is short enough to be acceptable. Document observed battery impact in Gate 8 documentation. |

---

## 8. Gate 8 criteria

**A controlled manual test can register/unregister geofences, qualify stationary presence, and deliver exactly one notification per reminder on real iOS and Android devices. This is the full geofence lifecycle.**

Specifically:
- [ ] Custom native modules (iOS CoreLocation + Android Geofencing API) link and build on RN 0.88 New Architecture.
- [ ] Geofence registration, unregistration, and listing work on both platforms (JS ↔ native bridge verified).
- [ ] ENTER event transitions reminder to `ARRIVAL_PENDING`.
- [ ] EXIT event transitions reminder from `ARRIVAL_PENDING` back to `ARMED`.
- [ ] Stationary qualification: speed < 2 mph counts toward 120s timer.
- [ ] Speed ≥ 2 mph resets the stationary timer (reminder stays `ARRIVAL_PENDING` while inside).
- [ ] Missing/invalid/stale speed samples do not count as stationary (timer pauses, does not advance or reset).
- [ ] 120 consecutive qualifying seconds → transition to `TRIGGERED`.
- [ ] Exactly one notification delivered per reminder (idempotent, even with duplicate events).
- [ ] App cold start: re-registers geofences for active reminders.
- [ ] Permission denied/restricted/unavailable: graceful UI, no crash.
- [ ] Capacity overflow (20+ iOS / 100+ Android): prioritizes `ARMED`, shows warning.
- [ ] Developer Tools visible in dev builds, absent in release builds.
- [ ] Simulated events clearly labeled `SIMULATED EVENT` and do not satisfy physical-device acceptance criteria.
- [ ] Unit tests pass (mocked service).

**Status:** Not started

---

## 9. Files summary

| Action | Path | Purpose |
|---|---|---|
| **Create** | `src/native/GeofencingModule.ts` | TypeScript interface for native geofence operations |
| **Create** | `src/native/GeofencingEventEmitter.ts` | Native event emitter bridge (ENTER/EXIT/location events) |
| **Create** | `src/services/geofencingService.ts` | Public TypeScript API: register, unregister, list, reconcile, subscribe |
| **Create** | `src/services/geofencingService.test.ts` | Unit tests (mocked native module) |
| **Create** | `src/hooks/useGeofencing.ts` | React hook: subscribe to geofence events, manage lifecycle |
| **Create** | `src/hooks/useGeofencing.test.ts` | Hook unit tests |
| **Create** | `src/components/GeofenceStatusBadge.tsx` | Visual indicator for geofence status |
| **Create** | `src/components/DeveloperGeofenceControls.tsx` | Dev-mode UI: simulate ENTER/EXIT, diagnostics |
| **Create** | `ios/GPSReminder/GeofencingManager.swift` | CoreLocation region monitoring + bounded location updates |
| **Create** | `ios/GPSReminder/GeofencingManager+Regions.swift` | Register/unregister/list/reconcile logic |
| **Create** | `ios/GPSReminder/GeofencingManager+Arrival.swift` | Stationary qualification (speed < 2 mph for 120s) |
| **Create** | `ios/GPSReminder/GeofencingManager+Bridge.swift` | RCTEventEmitter / TurboModule bridge |
| **Create** | `android/app/src/main/java/com/gpsreminder/GeofencingModule.kt` | Main native module (register/unregister/list) |
| **Create** | `android/app/src/main/java/com/gpsreminder/GeofencingReceiver.kt` | BroadcastReceiver for geofence events |
| **Create** | `android/app/src/main/java/com/gpsreminder/LocationCallbackWrapper.kt` | Bounded location updates for stationary qualification |
| **Create** | `android/app/src/main/java/com/gpsreminder/GeofencingPackage.kt` | NativeModules registration |
| **Modify** | `package.json` | Verify react-native-maps (already installed), update Android permissions |
| **Modify** | `android/app/src/main/AndroidManifest.xml` | Add FOREGROUND_SERVICE_LOCATION, ACCESS_FINE_LOCATION (if not present), INTERNET (for Play Services) |
| **Modify** | `ios/GPSReminder/Info.plist` | Add NSLocationWhenInUseUsageDescription / NSLocationAlwaysAndWhenInUseUsageDescription |
| **Modify** | `src/screens/MapScreen.tsx` | Wire geofence status to map markers (color-coded per state machine) |
| **Modify** | `src/screens/SettingsScreen.tsx` | Add Developer Tools row + geofence diagnostic panel (Phase 8.9) |
| **Modify** | `src/stores/reminderStore.ts` | Integrate geofencingService: register on save(ARMED), unregister on TRIGGERED/COMPLETED/CANCELLED |
| **Modify** | `tracking/INTERACTION_REGISTRY.md` | Add geofence-related testIDs |
| **Modify** | `tracking/KNOWN_ISSUES.md` | Add new geofencing issues as discovered during testing |
| **Modify** | `docs/DECISIONS.md` | Record library choice, compatibility results, platform-specific decisions |

---

## 10. Post-Gate 8: handoff to Phase 9

Phase 8 delivers the *full geofence lifecycle*: registration, stationary qualification, and triggered notification. Phase 9 (Maestro E2E) will automate regression testing of the UI flows using stable testIDs.

The geofencing service interface is designed to be independent of the UI — it exposes a pure event stream that the reminder store consumes. This means:
- Phase 8 can be tested independently with physical devices.
- Phase 9 (Maestro) only needs to verify that the UI reflects the correct state machine transitions triggered by physical geofence events.
- Developer-mode simulation controls (Task 8.9) provide deterministic test inputs for Maestro flows without requiring physical presence at a geofence location.

The stationary qualification logic (speed < 2 mph for 120s) is the core product differentiator and must be validated on real devices. No simulation or emulator can fully replicate background GPS behavior, so Gate 8 requires physical device testing regardless of simulator results.
