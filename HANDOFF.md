# Handoff — GPS Reminder Mobile App

## Current State: Plan 3 Complete (commit `c832252a`)

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
- 114/114 Vitest tests pass (setup + theme tokens + theme context + component files + models + state machine + native module interfaces)
- ESLint clean (no prettier plugin due to version conflict — noted for later fix)
- .gitignore created with RN-specific ignores

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

## Next Step: Plan 4 — Geofence Orchestration

### What Plan 4 Will Do
1. Create `GeofenceOrchestrator` service that bridges reminder store ↔ native geofencing
2. On reminder create: register with native module (if active)
3. On geofence event: update reminder status via state machine + create event log entry
4. Handle permission denial gracefully (show monitoring warning UI)
5. Implement geofence prioritization when iOS 20-region limit hit
6. Write unit tests for orchestrator logic
7. Verify TypeScript compiles, lint passes, tests pass

### Drift-Check Command (after Plan 4)
```bash
git diff c832252a..HEAD -- src/services/GeofenceOrchestrator.ts src/hooks/useGeofencing.ts
```

### Key Integration Points
- `ReminderStore` (Plan 2) ↔ `GeofenceOrchestrator` (Plan 4) ↔ Native module (Plan 3)
- State machine transitions triggered by geofence events
- Event log entries created for each state transition

## Emergency Recovery Notes
- If system crashes, resume from Plan 1 by reading `docs/superpowers/plans/01-design-system.md`
- All library versions are pinned in `package.json` — run `npm install --legacy-peer-deps` to restore
- Source files are committed at `15f8673` — use `git checkout 15f8673 -- src/` to restore source
