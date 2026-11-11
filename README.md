# GPS Reminder

Location-triggered reminders for mobile. Create a reminder tied to a place and radius. When you enter that area, you get a notification (sound + vibration). No time-based triggers — purely geographic.

**Core philosophy:** One-action reminders, not recurring tasks. "When I enter the grocery store, remind me to buy eggs."

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run on iOS simulator
npx react-native run-ios --simulator "iPhone 14"

# 3. Run on Android emulator
npx react-native run-android
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native 0.74.4 (TypeScript, strict mode) |
| State Management | Zustand v4.5.2 |
| Navigation | React Navigation 6.x (Stack + Bottom Tabs) |
| Storage | react-native-sqlite-storage v6.0.1 |
| Maps | react-native-maps ^1.14.0 (legacy arch compatible) |
| Geolocation | react-native-geolocation-service |
| Testing | Vitest + Maestro (E2E) |

**Minimum supported:** iOS 13+, Android 10 (API 29).

## Project Structure

```
src/
├── models/          # Domain models (Reminder, ReminderStatus, LocationSource)
├── services/        # Business logic (StateMachine, RegistrationManager)
├── native/          # TypeScript interfaces for native modules
├── stores/          # Zustand stores (reminderStore, notificationStore)
├── data/            # Persistence layer (SQLiteAdapter, ReminderRepositoryImpl)
├── theme/           # Design tokens + ThemeProvider (colors, typography, spacing)
├── hooks/           # React hooks (useGeofencing, useCurrentLocation, useMapPin)
├── ui/              # UI components (all 7 screens)
└── navigation/      # Navigation shell (AppNavigator, navigationTypes)

native-modules/      # Native code (iOS Swift/Obj-C, Android Kotlin)
docs/                # Documentation (spec, plans)
```

## Design System: Glass Layered (Dark Mode First)

- **Graphite** `#171D22` — Background
- **Frost** `#E5EAED` — Text, borders
- **Signal Red** `#F52232` — Primary actions, errors
- **Waiting Amber** `#D99A42` — Waiting state (inside geofence, outside target)
- **Success Green** `#3C8D70` — Success states

Typography: 6 sizes (26/19/17/15/13/11). Primary: Inter, Technical labels: IBM Plex Mono.

## Status: MVP In Progress

The app has a working skeleton with core UI screens, state machine, and SQLite persistence. Key features are stubbed:

| Feature | Status |
|---|---|
| Create / Save reminders | ✅ Working (stubbed data) |
| Load / Edit reminders | ✅ Working (stubbed data) |
| Activate / Deactivate | ✅ Working (stubbed data) |
| Geofence event processing | ⚠️ Stubbed — geofence bridge not wired |
| Map interaction (pin placement) | ⚠️ Stubbed — no real map integration |
| Location search (Nominatim) | ⚠️ Stubbed — no API integration |
| Save locations (SavedPlace) | ❌ Not implemented |

See `docs/spec.md` for full specifications and `docs/superpowers/plans/` for implementation plans.

## Testing

```bash
# Unit tests (Vitest)
npx vitest run

# E2E tests (Maestro)
npx maestro test src/__tests__/maestro/

# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/
```

## Documentation

- `docs/spec.md` — Source of truth (requirements, models, constraints)
- `docs/superpowers/plans/` — Implementation plans (dependency-ordered, testable)
