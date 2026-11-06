# Handoff — GPS Reminder Mobile App

## Current State: Plan 5 Complete (commits `c832252a` → `9afc7461`)

### What's Done
- React Native 0.74.4 project scaffolded with TypeScript strict mode
- Compatible library versions researched and installed (via npm install --legacy-peer-deps):
  - zustand ^4.5.2 (v5 has Hermes issues, v4 works)
  - @react-navigation/native ^6.1.9 (v7 requires newer RN)
  - react-native-maps ^1.14.0 (old arch, RN 0.74)
  - react-native-google-mobile-ads ^13.2.0 (legacy, v17+ requires RN 0.86 + New Arch)
  - react-native-iap ^12.16.0 (v14+ uses Nitro Modules)
  - react-native-sqlite-storage ^6.0.1
  - All other deps pinned for RN 0.74 compatibility
- TypeScript compiles clean (npx tsc --noEmit)
- 179/179 Vitest tests pass (setup + theme tokens + theme context + component files + models + state machine + native module interfaces + orchestration + location selection)
- ESLint clean (no prettier plugin due to version conflict — noted for later fix)
- .gitignore created with RN-specific ignores
- Glass Layered assets in `assets/` (icons, background, concept board)

### Plan 1 Deliverables (commit `55c50c3e`, tokens updated at `18801df4`)
- Theme tokens: Glass Layered palette — Graphite `#171D22`, Frost `#E5EAED`, Signal red `#F52232`, Waiting amber `#D99A42`, Success green `#3C8D70`
- Typography: 6 sizes (26/19/17/15/13/11), Inter primary, IBM Plex Mono for technical labels
- Spacing: 4dp grid (4–48), includes 20 and 40
- Radii: small 10, input 14, card 20, large 24, pill/modal 28
- Elevation: graphite shadow (blur 18, offset 0,6)
- Motion: includes durationReduced for reduced-motion preference
- ThemeContext with ThemeProvider + useTheme() hook (auto dark mode detection)
- Navigation shell: AppNavigator with Stack + Bottom Tabs, placeholder screens
- 6 reusable components: Button, Input, Card, Badge, Divider, SafeAreaWrapper
- All components consume theme tokens via useTheme() context

### Plan 2 Deliverables (commit `6197a7bd`)
- **Models** (src/models/): ReminderStatus, LocationSource, Reminder entity, ReminderEvent, NotificationDeliveryRecord
- **State Machine** (src/services/StateMachine.ts): 21 valid transitions, haversine distance, determineInitialStatus
- **SQLite Persistence** (src/data/): Full CRUD for reminders, events, notification logs
- **Zustand Store** (src/stores/reminderStore.ts): CRUD actions, state machine integration, validation

### Plan 3 Deliverables (commit `c832252a`)
- **TypeScript interfaces** (src/native/GeofencingModule.ts): Full type definitions for register/unregister/checkPermissions + event subscription
- **React hook** (src/hooks/useGeofencing.ts): register/unregister/clearAll/checkPermissions actions, event listening, app state handling
- **iOS native** (native-modules/ios/): GeofenceManager.swift (Core Location), GeofencingModule.m (Objective-C bridge)
- **Android native** (native-modules/android/): GeofenceManager.kt (GeofencingClient), GeofenceBroadcastReceiver.kt, GeofencingPackage.kt
- **Manifest/Plist updates**: All required permissions for both platforms

### Plan 4 Deliverables (commit `eb9dbe17`)
- **RegistrationManager** (src/services/RegistrationManager.ts): Maps reminders ↔ native geofences, capacity policy (iOS 20 / Android 500), priority-based dropping (ARMED > WAITING_FOR_EXIT > DRAFT), restart recovery
- **GeofenceEventProcessor** (src/native/GeofenceEventProcessor.ts): Converts native ENTER/EXIT events into state machine transitions, idempotency (TRIGGERED reminders ignore further events), valid transition checking
- **Tests**: 148/148 pass (RegistrationManager capacity policy + lifecycle, event processing + idempotency)

### Plan 5 Deliverables (commit `9afc7461`)
- **TargetLocation** (src/models/TargetLocation.ts): Canonical model for all 3 location methods (GPS, map pin, search) with validation
- **LocationService** (src/services/LocationService.ts): getCurrentPosition() + watchPosition() stubs for device
- **SearchService** (src/services/SearchService.ts): Online-only place search with OfflineError when offline
- **MapCacheService** (src/services/MapCacheService.ts): Tile caching — downloadArea, isTileCached, isAreaCached, getCachedAreas
- **Hooks** (src/hooks/): useCurrentLocation (loading/error state), useMapPin (pin placement, radius clamping 10-500m)
- **UI** (src/ui/): MapView (placeholder with offline indicator), CreateReminderLocationPicker (GPS/map/search tabs, radius presets, offline banner)
- **Tests**: 179/179 pass (TargetLocation validation, GPS service, map cache CRUD, search online/offline)

### Files in Project Root
```
package.json          — Dependencies (verified compatible versions)
tsconfig.json         — TypeScript strict mode config
.eslintrc.js          — ESLint (TypeScript parser, no prettier rule)
.prettierrc.json      — Prettier config (JSON format)
vitest.config.ts      — Vitest test runner + coverage
babel.config.js       — Babel preset (React Native)
metro.config.js       — Metro bundler config
index.js              — RN entry point
app.json              — App metadata (name: GPSReminder)
.gitignore            — RN-specific ignores (node_modules, android/, ios/, etc.)
```

### Files in src/
```
src/app.tsx           — Placeholder root component (to be replaced by Plan 1)
src/index.ts          — Re-exports App from app.tsx
src/__tests__/plan0-setup.test.ts  — 6 setup verification tests
```

### Known Issues/Notes
- ESLint prettier rule disabled due to eslint-plugin-prettier + Prettier 3.x version conflict. Can be fixed by downgrading eslint-plugin-prettier or upgrading Prettier to 4.x when ready.
- Dependencies installed with --legacy-peer-deps due to react-native-maps requiring react >= 18.3.1 while RN 0.74 ships with react 18.2.0. This is acceptable for now but should be revisited if upgrading to RN 0.75+.
- CocoaPods not installed (RN init failed on pod step). iOS builds will need `cd ios && bundle install && bundle exec pod install`.

## Next Step: Plan 6 — Notifications & Recovery

### What Plan 6 Will Do
1. Create notification scheduling service (local notifications with sound/vibration)
2. Implement notification delivery tracking (record when delivered, handle failures)
3. Handle app/device restart recovery — restore pending notifications
4. Implement permission status monitoring + warning UI
5. Write unit tests for notification scheduling, delivery tracking, recovery
6. Verify TypeScript compiles, lint passes, tests pass

### Drift-Check Command (after Plan 6)
```bash
git diff 9afc7461..HEAD -- src/services/NotificationService.ts src/ui/PermissionWarningScreen.tsx
```

### Key Integration Points
- `GeofenceEventProcessor` (Plan 4) → triggers notifications when reminder TRIGGERED
- `ReminderRepository` (Plan 2) → stores notification delivery records
- Native module (Plan 3) → `onGeofenceEvent` listener triggers notification scheduling

## Emergency Recovery Notes

### System crash — resume procedure

1. **Identify last completed plan.** Read `docs/superpowers/plans/README.md` for the plan index and current status. Cross-reference with the last committed commit hash.
2. **Restore source files.** Run `git checkout <last-plan-commit> -- src/` to restore the working tree to that plan's state.
3. **Restore dependencies.** Run `npm install --legacy-peer-deps`.
4. **Verify baseline.** Run `npx tsc --noEmit` and `npx vitest run`. Confirm tests pass before continuing.
5. **Read the plan document.** Open `docs/superpowers/plans/<plan-number>-<name>.md`. Identify which checklist items are already done (check those in git) vs. what remains.
6. **Drift-check.** Run `git diff <plan-commit>..HEAD -- <affected-paths>` to verify nothing was left behind.
7. **Continue implementation.** Follow the remaining checklist items in order.

**Last completed plan:** Plan 5 (Location Selection & Maps) — commit `9afc7461`.
**Remaining plans:** 6 (Notifications & Recovery), 7 (Core UI Flows), 8 (Advertising), 9 (Paid Themes), 10 (Release Hardening).

### .prompts/ files — what they are and when to reference them

| File | Purpose | When to use |
|---|---|---|
| `gps-reminder-revised-development-prompt.md` | Master product spec + engineering planning prompt. Defines all functional requirements (reminder creation, location selection, geofencing behavior, notification rules), non-functional constraints (offline-first, accessibility, monetization), product decisions (platforms, design system, ad strategy), and the mandatory planning workflow. | **Always.** Reference this when implementing any feature to verify spec coverage, check constraints, or resolve requirement questions. This is the single source of truth for what the app must do. |
| `gps-location-reminder-product-specification.docx` | Original Word-format product specification (pre-revision). Contains the raw feature list and requirements before they were structured into the revised prompt. | Only when a requirement in the revised prompt seems ambiguous or incomplete — cross-check against the original spec for context. |

**Rule:** Always read `gps-reminder-revised-development-prompt.md` fully before starting any new plan. Do not write application code until the plan has been reviewed against this spec and approved.

### Known Issues/Notes
- ESLint prettier rule disabled due to eslint-plugin-prettier + Prettier 3.x version conflict. Can be fixed by downgrading eslint-plugin-prettier or upgrading Prettier to 4.x when ready.
- Dependencies installed with --legacy-peer-deps due to react-native-maps requiring react >= 18.3.1 while RN 0.74 ships with react 18.2.0. This is acceptable for now but should be revisited if upgrading to RN 0.75+.
- CocoaPods not installed (RN init failed on pod step). iOS builds will need `cd ios && bundle install && bundle exec pod install`.
