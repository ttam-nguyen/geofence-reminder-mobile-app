# Plan 10: Release Hardening

## Feature Name
Release Candidate — Real-Device Test Matrix, Performance Review, Store Disclosures, Release Checklist

## Goal
Validate the complete application on real devices across supported platform versions. Address performance, battery impact, store compliance, and prepare release artifacts.

## Architecture
- Test matrix: run all acceptance criteria from spec §10 on physical devices (iOS 13+ and Android 10+)
- Performance profiling: memory, CPU, battery impact of geofencing + background operation
- Store compliance: privacy policy, permissions documentation, ad disclosures
- Release artifacts: build IPA/APK, store listing metadata

## Tech Stack
| Layer | Choice |
|---|---|
| Testing | Real devices (iOS physical + Android physical/emulator with Google Play Services) |
| Profiling | Xcode Instruments (iOS), Android Profiler (Android) |
| Build | `react-native bundle` + Xcode archive (iOS), `./gradlew assembleRelease` (Android) |

## Spec References
- §10 Quality, reliability, and acceptance criteria: 21 scenarios on real devices
- §5 Background constraints: document swipe-away, force-stop, reboot limitations per platform
- §10 Release candidate must demonstrate: no duplicate completions, correct state restoration, offline core behavior, no continuous GPS polling, clear permission/monitoring status, no blocking dependency on ads/network
- §11 Plan 10 (Release Hardening): real-device test matrix, performance/battery review, store disclosures, privacy documentation, release checklist

## Global Constraints
- Simulator testing is **insufficient** for geofencing validation (spec §5)
- Must test on physical devices: iOS 13+ and Android 10+ (minimum supported versions)
- Battery impact: geofencing should not drain battery faster than background app monitoring (~5-10% per day)
- No continuous GPS polling during normal operation (region monitoring only)
- Store compliance: privacy policy, permissions documentation, ad disclosures required

## Review Focus
- All 21 acceptance criteria from spec §10 pass on real devices
- No duplicate notifications after repeated entry events
- Correct state restoration after app/device restart
- Correct registration/removal behavior (register, edit, cancel, delete)
- Offline core behavior works (create, view, edit, delete reminders without network)
- No continuous GPS polling (verified via profiler)
- Clear permission and monitoring status displayed
- No blocking dependency on ads or network access
- Usable and accessible on minimum supported screen sizes

## Files to Create

```
docs/
  release-checklist.md         — Pre-release checklist (functional, technical, store compliance)
  privacy-policy.md            — Privacy policy draft (data collection, permissions, third-party services)
  store-listing/
    ios-app-store-metadata.json  — App Store listing metadata (name, description, keywords, screenshots list)
    android-google-play-metadata.json — Google Play listing metadata

scripts/
  run-real-device-tests.sh     — Script to run acceptance criteria tests on connected devices

src/__tests__/
  acceptance/
    spec10-acceptance.test.ts  — All 21 scenarios from spec §10 as automated tests (where possible)
```

## Interfaces

### Acceptance Test Matrix

| # | Scenario | Automated Test | Real-Device Manual Test |
|---|---|---|---|
| 1 | Create reminder inside target → WAITING_FOR_EXIT | ✅ StateMachine.test.ts | Real device: create at current location, verify status |
| 2 | Initial geofence registration while inside does not trigger | ✅ StateMachine.test.ts | Real device: create inside, wait 5 min, no notification |
| 3 | Confirmed exit transitions to ARMED | ✅ StateMachine.test.ts + orchestrationStore.test.ts | Real device: walk out, verify ARMED status |
| 4 | Next confirmed entry triggers exactly once | ✅ orchestrationStore.test.ts | Real device: walk back in, verify ONE notification |
| 5 | Create reminder outside radius → ARMED | ✅ StateMachine.test.ts | Real device: create 500m away, verify ARMED |
| 6 | Enter radius → trigger exactly once | ✅ orchestrationStore.test.ts | Real device: walk into radius, verify ONE notification |
| 7 | Repeated/duplicate entry events do not duplicate alerts | ✅ orchestrationStore.test.ts (idempotency) | Real device: stay in radius 10 min, verify ONE notification |
| 8 | Exit alone never triggers | ✅ StateMachine.test.ts | Real device: create inside, walk out, verify no notification |
| 9 | Two reminders same coordinates handled independently | ✅ RegistrationManager.test.ts | Real device: create 2 reminders at same spot, both trigger |
| 10 | Edit location/radius safely updates state and registration | ✅ RegistrationManager.test.ts | Real device: edit reminder, verify new coordinates active |
| 11 | Cancel/delete removes registration where possible | ✅ RegistrationManager.test.ts | Real device: cancel, verify geofence unregistered |
| 12 | Restart restores reminder state and eligible geofences | ✅ RecoveryService.test.ts | Real device: kill app, reopen, verify geofences restored |
| 13 | Offline creation using current GPS works | Manual (network off) | Real device: offline, create reminder, verify works |
| 14 | Offline map pin selection works with cached data | Manual (network off) | Real device: offline, place pin on cached map |
| 15 | Live search clearly reports internet unavailable | ✅ SearchService.test.ts | Real device: offline, attempt search, verify error message |
| 16 | Ad network failure/offline state does not block reminders | ✅ AdService.test.ts | Real device: offline, create + trigger reminder, verify works |
| 17 | Notification permission denial is explained | ✅ PermissionStatusView test | Real device: deny notifications, verify status message |
| 18 | Location permission revocation detected and explained | Manual (revoke in settings) | Real device: revoke location, verify warning displayed |
| 19 | Geofence capacity handled without silently losing reminders | ✅ RegistrationManager.test.ts (capacity) | Real device: register 25 reminders on iOS, verify capacity policy |
| 20 | Theme selection persists across restarts | ✅ themeStore.test.ts | Real device: switch theme, restart app, verify theme persists |
| 21 | Purchase restoration and entitlement state handled correctly | ✅ PurchaseService.test.ts | Real device: reinstall app, restore purchases, verify themes available |

## Tasks (Checkbox — Test-First)

- [ ] **Step 10.1:** Create acceptance test file covering all 21 scenarios
  - Create `src/__tests__/acceptance/spec10-acceptance.test.ts` — automated tests for scenarios 1-12, 15, 16, 17, 19, 20, 21
  - Manual test instructions for scenarios 2-4, 6, 8-11, 13-14, 18
  - Expected: All automated tests pass

- [ ] **Step 10.2:** Create release checklist
  - Create `docs/release-checklist.md` — sections:
    - Functional: all screens work, all flows complete
    - Technical: builds for iOS/Android, no console errors, no crashes
    - Geofencing: real-device tests pass (all 21 scenarios)
    - Performance: battery impact < 10%/day, memory < 200MB
    - Store compliance: privacy policy, permissions documented, ad disclosures present
  - Expected: Checklist covers all spec requirements

- [ ] **Step 10.3:** Create privacy policy draft
  - Create `docs/privacy-policy.md` — covers:
    - Data collected: location (only for active reminders), device info
    - Permissions: location (fine + background), notifications
    - Third-party services: Mapbox (tiles, geocoding), AdMob (ads), Google Play Services
    - Data storage: local only, no cloud sync for MVP
    - Data retention: active reminders stored indefinitely until deleted by user
  - Expected: Privacy policy covers all data flows

- [ ] **Step 10.4:** Create store listing metadata
  - Create `docs/store-listing/ios-app-store-metadata.json` — App Store name, subtitle, description, keywords, categories
  - Create `docs/store-listing/android-google-play-metadata.json` — Google Play name, short description, full description, keywords
  - Expected: Metadata ready for store submission

- [ ] **Step 10.5:** Create real-device test script
  - Create `scripts/run-real-device-tests.sh` — connects to devices, runs acceptance tests, reports results
  - Expected: Script runs automated tests on connected devices

- [ ] **Step 10.6:** Performance profiling (iOS)
  - Profile on physical iOS device (Xcode Instruments):
    - Memory: < 200MB at idle, < 300MB with map active
    - CPU: < 5% background, < 15% foreground with map
    - Battery: < 10% per day with geofencing active
  - Expected: Performance within acceptable bounds

- [ ] **Step 10.7:** Performance profiling (Android)
  - Profile on physical Android device (Android Studio Profiler):
    - Memory: < 200MB at idle, < 300MB with map active
    - CPU: < 5% background, < 15% foreground with map
    - Battery: < 10% per day with geofencing active
  - Expected: Performance within acceptable bounds

- [ ] **Step 10.8:** Real-device test execution (all 21 scenarios)
  - Deploy to physical iOS device (iOS 13+) and Android device (API 29+)
  - Run all 21 acceptance criteria from spec §10
  - Document results: pass/fail, observed latency, battery impact, OS-specific limitations
  - Expected: All scenarios pass (or documented exceptions with workarounds)

- [ ] **Step 10.9:** Build release artifacts
  - iOS: `xcrun xcodebuild archive -workspace ios/GPSReminder.xcworkspace -scheme GPSReminder -configuration Release -sdk iphoneos`
  - Android: `cd android && ./gradlew assembleRelease && cd ..`
  - Expected: IPA and APK/AAB generated successfully

- [ ] **Step 10.10:** Final review and commit
  - Review all plans against spec requirements (spec coverage self-review)
  - Create final commit with release artifacts and documentation
  - Command: `git add . && git commit -m "chore: release hardening — test matrix, profiling, store metadata, release checklist"`
  - Expected: Clean commit at revision `v10-release`

## Verification Commands

```bash
# TypeScript check (all code)
npx tsc --noEmit

# Lint check (all code)
npx eslint src/ docs/ scripts/

# All unit tests
npx vitest run

# Acceptance tests (automated)
npx vitest run src/__tests__/acceptance/

# iOS release build
cd ios && pod install && cd ..
xcrun xcodebuild archive -workspace ios/GPSReminder.xcworkspace -scheme GPSReminder -configuration Release -sdk iphoneos

# Android release build
cd android && ./gradlew assembleRelease && cd ..

# Real-device test script (if devices connected)
bash scripts/run-real-device-tests.sh
```

## Drift-Check Command

```bash
git diff v10-release..HEAD -- docs/ scripts/ src/__tests__/acceptance/
```
