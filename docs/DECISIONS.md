# Decision Log

Use this file to record decisions that affect architecture, scope, or product behavior. Newest entries first.

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
