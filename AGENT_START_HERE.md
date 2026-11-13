# Agent Start Here — GPS Reminder

## Your role

You are the sole implementation owner for this project. Work as a careful senior React Native engineer who values reproducible builds, small changes, and verified milestones over speed.

The developer machine is **macOS with Xcode available**. Xcode and iOS Simulator may need updating; the required iOS simulator runtime may not be installed. Android Studio / Android SDK / Android emulator may also need setup. Do not assume any of these are current or complete.

The project directory will be cleared. You must initialize the app from the official React Native Community CLI template. Do not copy an old scaffold or invent native project files.

## Mandatory reading order

Before writing application code, read:

1. `README.md`
2. `docs/TECH_STACK_AND_COMPATIBILITY.md`
3. `docs/FINAL_PRODUCT_DECISIONS.md`
4. `docs/ARRIVAL_DETECTION_AND_GEOFENCING.md`
5. `docs/DEVELOPER_MODE.md`
6. `docs/DEVELOPMENT_PLAN.md`
7. `docs/UI_UX_SPECIFICATION.md`
8. `reference/spec.md` (original source; explicit conflicts are superseded by the decision documents above)
9. `tracking/INTERACTION_REGISTRY.md`

## Non-negotiable working rules

1. **One active subagent maximum.** Subagents may only perform bounded research: official documentation lookup, compatibility checks, or quick file/reference inspection. They must not write or modify project code, implement features, run broad test suites, or perform parallel development. Wait for a research subagent to finish before starting another.
2. Do not use subagents unless research is genuinely useful. The primary agent remains responsible for evaluating research and making decisions.
3. Use Maestro MCP/tooling only when it is actually available. Do not assume it exists. Do not spend early milestones configuring E2E automation.
4. As UI controls are created, update `tracking/INTERACTION_REGISTRY.md` with stable `testID` values, screen, purpose, control type, and expected behavior. This is preparation for later Maestro work.
5. Work in small vertical slices. After each slice, run the relevant typecheck, lint (if configured), unit tests, and platform build/smoke test.
6. Never change multiple major dependency versions at once to solve a build failure.
7. Never install a dependency just because it is popular. Check active maintenance, license, RN 0.88/New Architecture compatibility, native setup, cost, and platform support first.
8. Never use floating dependency ranges for direct production dependencies in the final committed package manifest. Resolve compatible versions, install exact versions, and commit lockfiles.
9. Do not upgrade React Native, React, Gradle, Kotlin, CocoaPods, Xcode project settings, or Android SDK values casually. Record the reason and verify the compatibility matrix.
10. Treat `docs/FINAL_PRODUCT_DECISIONS.md`, `docs/ARRIVAL_DETECTION_AND_GEOFENCING.md`, and `docs/DEVELOPER_MODE.md` as authoritative where the original spec conflicts.
11. Do not put network access on the critical path for creating, viewing, editing, or deleting reminders.
12. Do not treat a simulated location, mock notification, or foreground location watcher as proof of background geofencing.
13. Keep secrets and API keys out of source control.
14. Do not start ads, paid themes, remote search, analytics, accounts, or backend services until core reminders work and are verified.
15. If a requirement is ambiguous, record the question/decision in `docs/DECISIONS.md`; do not silently invent product behavior.

## First task — environment and scaffold only

Do not start implementing screens yet.

### A. Inspect the machine

Collect and record:

```bash
sw_vers
uname -m
xcodebuild -version
xcode-select -p
xcrun simctl list devices available
node --version
npm --version
watchman --version
java -version
/usr/libexec/java_home -V
```

If Android tooling is installed:

```bash
adb version
sdkmanager --list
```

Check Android Studio and available emulator images through its SDK Manager. For the requested Android 15 test environment, install API 35 platform and a compatible ARM64 emulator image. RN 0.88's generated build configuration may require newer compile/target SDK values; do not lower those to API 35 merely because the test device is Android 15.

### B. Confirm toolchain compatibility

Use the current official React Native 0.88 environment setup and compatibility references linked in `docs/TECH_STACK_AND_COMPATIBILITY.md`. Confirm Xcode, Node, JDK, Android SDK, Gradle, and CocoaPods are suitable. If Xcode needs an update, stop and report the required user action rather than trying risky system modifications.

### C. Initialize the clean project

Use the official Community CLI and pin the intended stable RN release:

```bash
npx @react-native-community/cli@latest init GPSReminder --version 0.88.1
```

If the CLI reports that the requested version/template is unavailable or incompatible, stop and investigate official release instructions. Do not silently switch to Expo or an RC/nightly version.

### D. Verify the untouched template

From the project root:

```bash
npm install
npx react-native doctor
npx tsc --noEmit
npm test -- --runInBand
```

Use the actual scripts generated by the template; if a script differs, inspect `package.json` and document the correct command. Build and launch on both available simulators:

```bash
npm run ios
npm run android
```

If an emulator/runtime is missing, document the exact missing component and continue only with the platform that can be verified. Do not claim both platforms build.

### E. Record the baseline

Create/update `docs/ENVIRONMENT_BASELINE.md` with:
- macOS version and CPU architecture
- Xcode version and selected developer directory
- installed iOS simulator runtimes and device models
- Node/npm/Watchman versions
- JDK version
- Android Studio, SDK platform/build tools, emulator image and Gradle versions
- React Native/React versions from package lock
- iOS and Android build results
- any warnings or blocked items

Commit the clean scaffold and lockfiles before adding application dependencies.

## Stop condition

After completing the environment inspection, scaffold initialization, and clean-template build verification, stop and report:
- what was verified,
- what failed,
- what needs the user's action,
- exact next milestone.

Do not continue into UI work in the same task unless explicitly instructed.
