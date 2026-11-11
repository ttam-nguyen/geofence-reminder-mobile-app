# GPS Reminder — Implementation Plans

## Overview

This directory contains 10 independently testable implementation plans for the GPS Reminder mobile application, built with React Native and TypeScript. Each plan produces a verifiable commit at its own revision (e.g., `v0-scaffold`, `v1-design-system`).

**Source of truth:** All requirements, constraints, and domain models are defined in `docs/spec.md`. Cross-reference this index with the spec for full details.

## Plan Index (Dependency-Ordered)

| # | Plan File | Feature | Dependencies | Status |
|---|---|---|---|---|
| 0 | [00-project-setup.md](./00-project-setup.md) | Project Scaffolding & Verification Baseline | — | ✅ Done (v0-scaffold) |
| 1 | [01-design-system.md](./01-design-system.md) | Design System — Frosted Future Tokens | 0 | ✅ Done (v1-design-system) |
| 2 | [02-reminder-domain.md](./02-reminder-domain.md) | Reminder Models, State Machine, Local Data | 0 | ✅ Done (v2-reminder-domain) |
| 3 | [03-native-geofencing-poc.md](./03-native-geofencing-poc.md) | Native Geofencing Interfaces + POC | 0 | ✅ Done (v3-geofencing-poc) |
| 4 | [04-geofence-orchestration.md](./04-geofence-orchestration.md) | Geofence Registration Manager | 2, 3 | ✅ Done (v4-geofence-orchestration) |
| 5 | [05-location-selection-maps.md](./05-location-selection-maps.md) | Location Selection & Maps (stubbed) | 0 | ✅ Done (v5-location-selection) — stubbed, not real |
| 6 | [06-notifications-recovery.md](./06-notifications-recovery.md) | Notifications & App Lifecycle Recovery | 2, 3 | ✅ Done (v6-notifications) — stubbed, not wired |
| 7 | [07-core-ui-flows.md](./07-core-ui-flows.md) | Core UI Flows (All Screens) | 1, 2, 5, 6 | ✅ Done (v7-core-ui) — UI exists, services stubbed |
| 8 | [08-advertising.md](./08-advertising.md) | Advertising Integration | 7 | ⏳ Not started |
| 9 | [09-paid-themes.md](./09-paid-themes.md) | Paid Theme Store (IAP) | 1, 7 | ⏳ Not started |
| 10 | [10-release-hardening.md](./10-release-hardening.md) | Release Hardening | All | ⏳ Not started |

## Execution Order

**Critical path:** 0 → 3 (geofencing POC) — validate native geofencing before UI investment.

**Parallel tracks (no inter-dependencies):**
- Track A: 0 → 1 → 7 (UI development)
- Track B: 0 → 2 → 4 (domain + orchestration)
- Track C: 0 → 3 → 6 (native geofencing + notifications)
- Track D: 0 → 5 (location selection + maps)

**Next steps for meaningful device testing:**
Fix the geofence bridge (Plans 3 + 6 integration), then add real map integration (extend Plan 5).

## Tech Stack Summary

See `docs/spec.md` for full tech stack details.

## Plan Structure

Each plan contains:
- **Feature name** and **goal**
- **Architecture** and **tech stack** choices
- **Spec references** (cross-referenced to `docs/spec.md`)
- **Global constraints** (what must be true)
- **Review focus** (what to check during review)
- **Files created** (exact paths)
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
