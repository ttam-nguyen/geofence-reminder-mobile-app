# Technology Stack and Compatibility Baseline

**Research snapshot:** 2026-11-12. Re-check official sources before installation because React Native and native tooling move quickly.

## 1. Platform interpretation

The requested test environments are:
- iOS 27
- Android 15 (API 35)

These are test/runtime targets, not necessarily minimum supported OS versions. Keep the minimum deployment values generated/required by the selected React Native release unless the product owner explicitly chooses to drop older devices.

React Native 0.88.1's current compatibility matrix lists iOS minimum 15.1, Android min SDK 24, compile SDK 37, and target SDK 36. This means an Android 15 device (API 35) can be a test device while the project compiles against a newer SDK. Do not force `compileSdkVersion` or `targetSdkVersion` down to 35 without proving it is required and compatible with current store policy.

## 2. Framework baseline

| Layer | Decision | Policy |
|---|---|---|
| Framework | React Native 0.88.1 stable | Pin exact version; do not use 0.89 RC or nightly |
| Template | React Native Community CLI | Bare/native project; no Expo managed workflow |
| Language | TypeScript strict | No implicit `any`; type domain boundaries |
| React | 19.3.0 | Must match RN 0.88.1 template |
| JS engine | Hermes V1 | Keep template default |
| Architecture | New Architecture | Keep RN 0.88 default; do not disable to accommodate a stale package |
| State | Zustand 5.x | Add only after UI state requirements justify it |
| Navigation | React Navigation 7.x | `@react-navigation/native` + native stack + bottom tabs; verify peer dependencies |
| Persistence | SQLite via OP-SQLite | Add in persistence phase; check New Architecture and RN 0.88 compatibility at install time |
| Maps | `react-native-maps` | Add only after UI; verify Fabric/New Architecture support and provider configuration |
| Local notifications | Notifee | Free/open source; verify exact latest stable release, RN 0.88 compatibility and platform behavior before adoption |
| Geofencing | Small project-owned native module using Core Location / Android Geofencing APIs | No paid SDK in MVP; keep native module behind TS interface |
| Unit tests | Jest using the RN-provided Jest preset | Do not use Vitest as the default RN component test runner |
| E2E | Maestro | Deferred until UI identifiers and flows are stable |
| Animations | React Native Animated initially | Add Reanimated only if a concrete interaction requires it |
| Network status | `@react-native-community/netinfo` | Later; network status is informative, never required for core reminder CRUD |
| Geolocation foreground helper | Defer package decision | Native location permission/current-position API can be wrapped; foreground location is not geofencing |

## 3. Native toolchain baseline for RN 0.88.1

The official compatibility matrix currently reports:

| Requirement | RN 0.88.1 baseline |
|---|---|
| React | 19.3.0 |
| Xcode | 26.0+ |
| iOS deployment minimum | 15.1 |
| Android min SDK | 24 |
| Android compile SDK | 37 |
| Android target SDK | 36 |
| Node | 22.13+ (also lists newer supported major lines) |
| JDK | 17 |
| Gradle | 9.4.1 |

Treat the generated template as the source of truth for exact Android Gradle Plugin, Kotlin, Gradle wrapper, CocoaPods and Ruby settings. The compatibility matrix may list a minimum/current baseline, but the template pins a mutually compatible set.

### Machine setup checklist

- macOS on Apple Silicon or Intel; record architecture.
- Xcode 26 or newer, selected with `xcode-select`.
- iOS 27 simulator runtime installed (if available for installed Xcode).
- Android Studio with SDK Platform 35 for Android 15 testing.
- Install any newer SDK platform required by the generated RN template (currently compile SDK 37).
- Android ARM64 emulator image for Apple Silicon.
- Node 22.13+.
- Watchman.
- JDK 17.
- CocoaPods compatible with the generated iOS project.
- At least one iOS simulator and Android emulator that boot successfully.

Do not assume that the user's installed Xcode already includes the requested iOS 27 runtime. Verify with `xcrun simctl list devices available`.

## 4. Dependency installation policy

The first app scaffold must contain only template dependencies.

Add dependencies in this order:
1. Navigation.
2. State management.
3. Icons/visual primitives only if needed.
4. Database in the persistence phase.
5. Maps in the map integration phase.
6. Notification library in notification phase.
7. Native geofence module in geofencing phase.

For every dependency, record:
- package and exact version,
- license,
- last release/maintenance status,
- peer dependency requirements,
- RN 0.88.1 / React 19 / New Architecture compatibility evidence,
- iOS and Android minimum versions,
- required native configuration,
- whether it requires an API key or paid service,
- fallback/removal plan.

Use exact direct dependency versions and commit `package-lock.json`. Do not use `^` or `~` for direct dependencies in the final manifest. Transitive dependencies are governed by the lockfile.

## 5. Specific dependency guidance

### Navigation
Use React Navigation 7 with native stack and bottom tabs. Confirm all peer dependencies against the current official installation guide before adding. Navigation is an early UI dependency, so install it immediately after the bare template passes both platform builds.

### Zustand
Use Zustand 5.x. The old spec's claim that Zustand v5 has Hermes compatibility issues should not be carried forward without current reproducible evidence. Keep stores focused; do not use a global store for every local form field.

### SQLite
Preferred candidate: `@op-engineering/op-sqlite` (MIT). Its feature set includes iOS and Android support. Do not add it during UI work. Verify the currently released version, New Architecture compatibility, RN 0.88.1 build, and any iOS CocoaPods conflicts with the actual project before adopting. Create a repository interface first so the UI and domain logic do not depend directly on SQLite.

### Maps
`react-native-maps` is not a UI-phase dependency. The project's old version decision was based on the legacy architecture. Current project documentation distinguishes Fabric/New Architecture support (1.26.1+ requires RN >=0.81.1) from older legacy architecture versions. Re-check the current release and test a minimal map screen on both platforms before committing to it. A map placeholder is acceptable in the first UI phase.

### Notifications
Notifee is a free/open-source local notification library and documents support for iOS and Android. Validate current compatibility, permission behavior, Android notification channels, iOS foreground presentation, and custom sound behavior. Do not confuse local notifications with geofence monitoring.

### Geofencing
Do not rely on a JS timer, continuous GPS polling, or foreground-only location watcher. Use native platform APIs:
- iOS: Core Location region monitoring (`CLCircularRegion` / `CLLocationManager`).
- Android: Google Play services Geofencing API and a `PendingIntent`/receiver-based event path.

Implement a narrow TypeScript interface with native implementations. If a third-party geofence package is considered, it must pass the same compatibility, maintenance, license, and real-device checks. Do not select a paid background-location SDK for MVP without explicit approval.

### UI blur and animation
The desired frosted-glass look can be approximated initially using translucent fills, borders, gradients only if already available, and layered shadows. Defer native blur libraries and Reanimated until after the layout is stable. Prefer built-in `Animated` for small transitions at first.

### Testing
Use Jest and the React Native Jest preset/template configuration. Vitest in the old spec is not the default choice for RN native/component tests. Maestro can drive the compiled app using accessibility labels and stable identifiers; no in-app Maestro runtime dependency is required.

## 6. Official references

- React Native releases: https://reactnative.dev/releases/overview
- React Native 0.88 announcement: https://reactnative.dev/blog/2026/10/19/react-native-0.88
- React Native environment setup: https://reactnative.dev/docs/set-up-your-environment
- React Native compatibility matrix: https://reactnative.dev/
- React Navigation: https://reactnavigation.org/docs/getting-started
- Zustand: https://zustand.docs.pmnd.rs/
- OP-SQLite: https://op-engineering.github.io/op-sqlite/
- OP-SQLite repository: https://github.com/OP-Engineering/op-sqlite
- react-native-maps compatibility: https://github.com/react-native-maps/react-native-maps
- Notifee overview: https://notifee.app/react-native/docs/overview/
- Notifee environment support: https://notifee.app/react-native/docs/environment-support/
- Maestro React Native: https://docs.maestro.dev/get-started/supported-platform/react-native
- Apple region monitoring: https://developer.apple.com/documentation/corelocation/monitoring-the-user-s-proximity-to-geographic-regions
- Android geofencing: https://developer.android.com/develop/sensors-and-location/location/geofencing

## 7. Known risks and product constraints

- iOS region monitoring is limited to 20 monitored regions per app. Android's current Geofencing API documentation specifies a limit of 100 geofences per app per device user (not 500). Apply the lower applicable platform limit and maintain a priority policy.
- A geofence event may be delayed by the OS. Do not promise exact arrival-time delivery.
- Android `Location.getSpeedAccuracyMetersPerSecond()` was added in API 26. Since this RN baseline permits minSdk 24, the native adapter must handle API 24–25 without that property; never treat a missing speed or missing accuracy as 0 mph.
- Apple documents `CLLocation.speedAccuracy`; a negative value means the speed value is invalid. Treat invalid or low-confidence measurements as indeterminate, not stationary.
- Background location permission is sensitive and must be requested progressively with clear user education.
- Force-stop, app termination, reboot, battery saver, and OEM restrictions differ by platform. Document actual tested behavior.
- Simulator tests do not prove real background geofence behavior.
- Nominatim is a public service with usage policy and rate limits. Search must be optional, online-only, and not a dependency of core reminders. Do not send high-volume/autocomplete traffic.
- Ads and paid themes are non-MVP and must not introduce startup, storage, or notification dependencies.


## 8. Verified platform facts for arrival detection

- React Native 0.88 is the current stable line on the 2026-11-12 research snapshot; 0.89 is still scheduled as a future release. The compatibility matrix lists RN 0.88.1 with React 19.3.0, Xcode 26+, iOS 15.1 minimum, Android min SDK 24, compile SDK 37, target SDK 36, Node 22.13+, JDK 17, and Gradle 9.4.1. Re-check before scaffold creation.
- Android's Geofencing API limit is 100 active geofences per app per device user. The legacy product spec's 500 figure is outdated and must not be implemented.
- Android provides a native dwell transition with a loitering delay, but dwell is not a speed measurement. Keep the product's speed qualification as an independent requirement.
- Android speed-accuracy metadata is available from API 26. Android API 24–25 needs a fallback strategy based on valid speed availability and conservative position-displacement validation.
- Apple Core Location exposes `speed` and `speedAccuracy`; negative `speedAccuracy` means invalid speed.
- Apple advises minimizing high-accuracy location updates and stopping them when no longer needed. Use bounded verification updates only while an arrival candidate is pending; never continuously poll GPS throughout normal operation.
