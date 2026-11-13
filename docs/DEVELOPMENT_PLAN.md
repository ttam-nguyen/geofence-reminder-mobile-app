# Development Plan — One Person, One Verified Milestone at a Time

## Operating model

This is a sequential project, not a multi-agent implementation program. The primary agent owns design decisions, implementation, integration, tests, and documentation.

### Subagent policy
- Maximum one active subagent at any moment.
- Research-only: web research, official documentation lookup, dependency compatibility investigation, or quick inspection of a known file.
- No code writing, file editing, feature implementation, parallel test runs, or architecture ownership.
- The primary agent reviews all findings and decides whether to use them.
- Do not spawn a subagent for routine tasks that the primary agent can complete quickly.

### Milestone discipline
Each milestone must end with:
1. What changed.
2. Files added/modified.
3. Commands run.
4. Build/test results for iOS and Android separately.
5. Known limitations.
6. Updated interaction registry / decision log / environment baseline where relevant.
7. A clear GO / NO-GO recommendation for the next milestone.

Do not mark a milestone complete based on code inspection alone. Run the relevant verification.

---

## Phase 0 — Environment audit and clean scaffold

**Goal:** Prove that the development machine can build a clean RN app before adding dependencies.

Tasks:
- Inspect macOS, architecture, Xcode, simulator runtimes, Node, npm, Watchman, JDK, Android Studio, SDKs, emulator.
- Update Xcode only if needed and with user approval if system action is required.
- Install iOS 27 runtime if available for the installed Xcode.
- Install Android 15 API 35 emulator image and any newer SDK required by RN 0.88.
- Initialize using official RN Community CLI:
  `npx @react-native-community/cli@latest init GPSReminder --version 0.88.1`
- Run the untouched template on both platforms.
- Commit scaffold and lockfiles.
- Record `docs/ENVIRONMENT_BASELINE.md`.

**Gate 0:** Clean template typechecks and builds/runs on both target simulators, or a precise platform blocker is documented. No app features yet.

## Phase 1 — App shell, navigation, and design tokens

**Goal:** Create a visually coherent, navigable shell with no backend.

Tasks:
- Add React Navigation 7 after peer dependency verification.
- Create theme tokens and reusable primitives.
- Implement app shell, bottom tabs (Home, Map, Settings), stack routes, headers, safe areas, status/navigation bar treatment.
- Use deterministic mock data only.
- Add loading/empty/error/disabled states.
- Add stable `testID` and accessibility labels to every interactive element.
- Update interaction registry.

**Gate 1:** All primary routes open and back navigation works. No dead buttons. iOS and Android builds pass. No runtime warnings introduced by app code.

## Phase 2 — Screen-by-screen UI with mock data

Implement in this order:
1. Home Dashboard.
2. Reminder List and filters.
3. Create Reminder form.
4. Reminder Detail.
5. Map screen (visual placeholder/map mock; no live map dependency yet).
6. Settings.
7. Onboarding.

Why this order: the home/list/create/detail loop is the core user journey. Onboarding and optional settings should not block that loop.

Each screen must include:
- initial/default state,
- populated state,
- empty state,
- validation state,
- disabled state where applicable,
- loading state where an operation is asynchronous,
- error state where an operation may fail,
- accessibility and test identifiers.

Use local component state for transient UI and a small mock repository/store for shared in-memory reminders. Do not create a backend or database yet.

**Gate 2:** The complete mock reminder journey works: Home → Create → Save → Detail → Edit → List → Delete. Search/filter works on mock data. UI is responsive at 375pt width and on Android emulator. No native geofencing or remote API.

## Phase 3 — UI polish and interaction freeze

**Goal:** Finish visual consistency before data/native complexity.

Tasks:
- Tune typography, spacing, card hierarchy, status badges, pill buttons, fieldsets, shadows, translucency.
- Add restrained transitions and loading/progress indicators.
- Respect reduced-motion setting.
- Test small and large text, screen reader labels, contrast, touch targets.
- Verify keyboard behavior and safe areas.
- Freeze the initial interaction contract and complete registry.
- Add screenshot capture checklist; do not start Maestro flows unless requested.

**Gate 3:** User approves the visual direction and the screen/interaction registry is complete enough to derive Maestro tests.

## Phase 4 — Domain model and state machine

**Goal:** Implement product rules independent of UI and native APIs.

Tasks:
- Add types/enums from the original spec.
- Implement transition validator and tests.
- Implement Haversine distance and initial status determination.
- Implement idempotent event processor as a pure service.
- Add validation for title 1–100 chars, description 0–500, coordinate ranges, radius clamp 10–500m.
- Implement repository interfaces and mock/in-memory implementation.
- Add `ARRIVAL_PENDING` to the lifecycle model and tests for the updated transitions.
- Implement an injectable `ArrivalVerificationConfig` so production defaults and test overrides are testable without native location hardware.
- Keep the production radius and trigger thresholds fixed; developer-mode values are a build-only test facility.

**Gate 4:** Domain tests cover the complete state machine, including TRIGGERED terminal behavior and duplicate events.

## Phase 5 — Offline persistence

**Goal:** Replace mock repository with durable local SQLite storage.

Tasks:
- Evaluate and pin OP-SQLite version after RN 0.88 compatibility build.
- Define schema and migrations.
- Implement repository adapter and transaction boundaries.
- Persist reminders, saved places, event/audit records, notification delivery records.
- Add app startup hydration, migration tests, failure handling.
- Ensure core CRUD works with airplane mode enabled.
- Avoid accounts/cloud sync.

**Gate 5:** Create/edit/delete survives force-closing and reopening the app on both platforms. Core screens work offline. Database migration and corruption/error paths are tested.

## Phase 6 — Foreground location and map

**Goal:** Add actual location selection without background geofencing yet.

Tasks:
- Implement permission education and permission state UI.
- Current location selection.
- Map pin selection and radius preview.
- Add map dependency only after a two-platform compatibility spike.
- Implement online place search only as an optional enhancement.
- Cache the last useful map/selection data where appropriate.
- Handle denied/restricted/unavailable location and offline search explicitly.

**Gate 6:** Current location and map pin selection work on physical devices. Offline CRUD still works. Search failure does not block save if coordinates are already selected.

## Phase 7 — Local notifications

**Goal:** Prove local notifications independently of geofencing.

Tasks:
- Integrate Notifee or documented native implementation after compatibility check.
- Request permissions with clear rationale.
- Create Android notification channel(s).
- Support sound preference and vibration preference where OS permits.
- Test foreground/background delivery and notification tap handling.
- Record delivery attempts and failures.
- Make permission denial a clear non-crashing state.

**Gate 7:** A controlled manual test can schedule/deliver/cancel a local notification on real iOS and Android devices. This is not yet proof of geofence delivery.

## Phase 8 — Native geofencing

**Goal:** Implement the actual location-triggered reminder lifecycle, including the two-minute stationary qualification.

Tasks:
- Build TypeScript interface for register, unregister, list/reconcile, permission state, and event subscription.
- Implement iOS Core Location region monitoring.
- Implement Android Geofencing API with receiver/PendingIntent path.
- Respect platform limits and priority policy from product spec.
- Implement WAITING_FOR_EXIT → ARMED on exit.
- Implement ARMED → ARRIVAL_PENDING on entry.
- While inside, qualify stationary presence using valid speed measurements strictly below 2 mph (0.89408 m/s) for 120 consecutive seconds.
- If speed reaches or exceeds 2 mph, reset the stationary timer but keep the candidate pending while still inside; the timer can begin again after the user slows down.
- If the user exits, cancel the pending candidate and return to ARMED.
- Do not count missing, stale, invalid, or insufficiently accurate location/speed samples as zero speed.
- Android native dwell can be used as a supporting signal, not as a substitute for speed validation.
- Make event handling idempotent; exactly one notification per reminder.
- Persist state before/with notification delivery safely.
- Reconcile registrations after app launch and state changes.
- Handle location permission revocation, reboot, process death, and capacity overflow.
- Respect current native limits: iOS 20 monitored regions; Android 100 active geofences per app per device user.
- Implement build-time gated Developer Mode using `docs/DEVELOPER_MODE.md`; verify release builds hard-disable it.
- Do not poll GPS continuously.

**Gate 8:** Real-device matrix passes. Simulator success alone is insufficient. Document OS-dependent limitations and observed event delays.

## Phase 9 — Maestro E2E and regression

Only start after the UI and stable test IDs are in place.

Tasks:
- Confirm Maestro CLI/MCP is available and functioning.
- Build flows using stable identifiers from `tracking/INTERACTION_REGISTRY.md`.
- Start with onboarding, create reminder, edit, delete, search/filter, settings.
- Add offline flow and permission-denial flows where deterministic.
- Geofence E2E requires physical device/manual test harness; do not fake it with simulator UI tests.
- Keep test flows short and deterministic.
- Add screenshots on failure.

**Gate 9:** Core UI flows pass on both platforms. Failures are triaged; no flaky test is ignored.

## Phase 10 — Release hardening

Tasks:
- Validate all original acceptance scenarios.
- Battery and background behavior.
- Privacy disclosures for location and notifications.
- Accessibility audit and text scaling.
- Store compliance.
- Crash/error logging strategy (optional, privacy-conscious).
- Build release artifacts and verify signing setup.
- Final known-limitations document.

**Gate 10:** Release candidate is reproducible, core offline behavior verified, real-device geofence behavior documented, and no critical known defects.

---

## Explicitly deferred / not MVP

- Ads (banner, list, rewarded).
- Paid theme store / in-app purchases.
- Cloud accounts and synchronization.
- SMS.
- Social features.
- Analytics unless separately approved.
- Live place search during UI phase.
- Remote APIs for core reminder operation.

## Required documents to maintain

- `docs/ENVIRONMENT_BASELINE.md`
- `docs/DECISIONS.md`
- `tracking/INTERACTION_REGISTRY.md`
- `tracking/KNOWN_ISSUES.md`
- `tracking/ACCEPTANCE_MATRIX.md`

Do not write speculative completion claims. Mark each acceptance item `Not started`, `In progress`, `Verified on simulator`, or `Verified on physical device`.
