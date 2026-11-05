# GPS Reminder — Implementation Plans

## Overview

This directory contains 10 independently testable implementation plans for the GPS Reminder mobile application, built with React Native and TypeScript.

## Plan Index (Dependency-Ordered)

| # | Plan File | Feature | Dependencies | Testable Outcome |
|---|---|---|---|---|
| 0 | [00-project-setup.md](./00-project-setup.md) | Project Scaffolding & Verification Baseline | — | Build succeeds on iOS + Android |
| 1 | [01-design-system.md](./01-design-system.md) | Design System — Frosted Future Tokens | 0 | Theme tokens, navigation shell, reusable components |
| 2 | [02-reminder-domain.md](./02-reminder-domain.md) | Reminder Models, State Machine, Local Data | 0 | Models, state machine, SQLite repo, business-logic tests |
| 3 | [03-native-geofencing-poc.md](./03-native-geofencing-poc.md) | Native Geofencing Proof of Concept | 0 | iOS + Android geofence registration, background events |
| 4 | [04-geofence-orchestration.md](./04-geofence-orchestration.md) | Geofence Registration Manager | 2, 3 | Capacity policy, event processing, idempotency, restart recovery |
| 5 | [05-location-selection-maps.md](./05-location-selection-maps.md) | Location Selection & Maps | 0 | Current GPS, map pin, search, offline cache |
| 6 | [06-notifications-recovery.md](./06-notifications-recovery.md) | Notifications & App Lifecycle Recovery | 2, 3 | Local notifications, sound/vibration, restart recovery |
| 7 | [07-core-ui-flows.md](./07-core-ui-flows.md) | Core UI Flows (All Screens) | 1, 2, 5, 6 | Onboarding, home, create, list, details, map, settings |
| 8 | [08-advertising.md](./08-advertising.md) | Advertising Integration | 7 | Banner/list ads, rewarded ads, consent flow |
| 9 | [09-paid-themes.md](./09-paid-themes.md) | Paid Theme Store (IAP) | 1, 7 | Theme catalog, previews, purchase/restore, entitlements |
| 10 | [10-release-hardening.md](./10-release-hardening.md) | Release Hardening | All | Real-device test matrix, performance, store compliance |

## Execution Order

**Critical path:** 0 → 3 (geofencing PoC) — validate native geofencing before UI investment.

**Parallel tracks (no inter-dependencies):**
- Track A: 0 → 1 → 7 (UI development)
- Track B: 0 → 2 → 4 (domain + orchestration)
- Track C: 0 → 3 → 6 (native geofencing + notifications)
- Track D: 0 → 5 (location selection + maps)

**Earliest vertical slice:** 0 → 2 → 3 → 4 → 6
Result: Create reminder → geofence register → trigger → notify (no UI polish).

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Framework | React Native 0.74+ (TypeScript) |
| State Management | Zustand v5 |
| Navigation | React Navigation 6.x |
| Storage | react-native-sqlite-storage v7 |
| Maps | react-native-maps + Mapbox (MVP) |
| Notifications | Custom native modules (Core Location + Android NotificationManager) |
| Geofencing | Custom native modules (Core Location CLRegion + Android Geofencing API) |
| Ads | react-native-google-mobile-ads (AdMob) |
| IAP | react-native-iap v12.x |
| Testing | Vitest + React Native Test Renderer |

## Minimum Supported Versions

- iOS 13.0+
- Android API 29 (Android 10)

## Geofencing Limits

- iOS: 20 regions per app
- Android: 500 geofences per app

## Plan Structure

Each plan contains:
- **Feature name** and **goal**
- **Architecture** and **tech stack** choices
- **Spec references** (which spec sections apply)
- **Global constraints** (what must be true)
- **Review focus** (what to check during review)
- **Files to create** (exact paths, single responsibility per file)
- **Interfaces** (TypeScript definitions for all public APIs)
- **Tasks** (checkbox steps, test-first approach)
- **Verification commands** (exact commands with expected outcomes)
- **Drift-check command** (git diff from plan's revision)

## Execution Notes

1. Each plan produces a commit at its own revision (e.g., `v0-scaffold`, `v1-design-system`).
2. Drift-check commands verify no unintended changes since the plan's commit.
3. Tests must pass before committing each plan.
4. Real-device validation required for Plan 3 (geofencing) and Plan 10 (release).
5. SMS is explicitly excluded from all plans per spec §6.
