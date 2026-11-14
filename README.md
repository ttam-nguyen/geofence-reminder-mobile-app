# GPS Reminder

A location-triggered reminder app. Create reminders tied to a place — when you enter that area, you get notified.
No time-based triggers. Purely geographic. One-action reminders: "When I enter the grocery store, remind me to buy eggs."

## Tech Stack

- React Native 0.88.1 (TypeScript, strict mode)
- React 19.3.0
- Hermes V1 (New Architecture enabled)
- Navigation: React Navigation 7.x (stack + bottom tabs)
- State: Zustand 5.x
- Persistence: SQLite via OP-SQLite (planned)
- Maps: react-native-maps (planned)
- Notifications: notifee (planned)

## Quick Start

```bash
# Install dependencies
npm install

# iOS (CocoaPods needed on first run)
bundle install && bundle exec pod install --project-directory=ios
npm run ios

# Android (requires JAVA_HOME set — see below)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
npm run android
```

## JDK Requirement (Android builds)

This machine has JDK 26 as the system default, but React Native requires JDK 17–20.
Set `JAVA_HOME` before every Android build:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
```

Add the above to your shell profile (`~/.zshrc` or `~/.bash_profile`) so it persists across sessions.

## Documentation

| Document | Purpose |
|---|---|
| [AGENT_START_HERE.md](./AGENT_START_HERE.md) | Mandatory working rules and first task |
| [DEVELOPMENT_PLAN.md](./docs/DEVELOPMENT_PLAN.md) | Phased roadmap, gates, scope control |
| [TECH_STACK_AND_COMPATIBILITY.md](./docs/TECH_STACK_AND_COMPATIBILITY.md) | Selected baseline and dependency policy |
| [FINAL_PRODUCT_DECISIONS.md](./docs/FINAL_PRODUCT_DECISIONS.md) | Confirmed product decisions |
| [ARRIVAL_DETECTION_AND_GEOFENCING.md](./docs/ARRIVAL_DETECTION_AND_GEOFENCING.md) | Geofence spec (normative) |
| [DEVELOPER_MODE.md](./docs/DEVELOPER_MODE.md) | Build-time test overrides |
| [UI_UX_SPECIFICATION.md](./docs/UI_UX_SPECIFICATION.md) | Visual system and screen behavior |
| [ENVIRONMENT_BASELINE.md](./docs/ENVIRONMENT_BASELINE.md) | Machine/environment documentation |
| [spec.md](./reference/spec.md) | Original product spec (preserved for traceability) |
| [INTERACTION_REGISTRY.md](./tracking/INTERACTION_REGISTRY.md) | Stable testIDs for E2E automation |

## Project Priorities

- One primary agent/developer owns implementation.
- At most **one** subagent active (research only).
- Build UI and navigation first using deterministic mock data.
- Core reminder experience is offline-first.
- No geofencing, background location, live search, ads, or purchases during initial UI milestones.
- Production radius is fixed at 200m; users do not select a radius.
- Trigger only after valid speed remains strictly below 2 mph for 120 consecutive seconds inside the geofence.
- Do not claim geofencing works based on simulator-only testing.

# Getting Started

> **Note**: Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

## Step 1: Start Metro

First, you will need to run **Metro**, the JavaScript build tool for React Native.

To start the Metro dev server, run the following command from the root of your React Native project:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

## Step 2: Build and run your app

With Metro running, open a new terminal window/pane from the root of your React Native project, and use one of the following commands to build and run your Android or iOS app:

### Android

```sh
# Using npm
npm run android

# OR using Yarn
yarn android
```

### iOS

For iOS, remember to install CocoaPods dependencies (this only needs to be run on first clone or after updating native deps).

The first time you create a new project, run the Ruby bundler to install CocoaPods itself:

```sh
bundle install
```

Then, and every time you update your native dependencies, run:

```sh
bundle exec pod install
```

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
