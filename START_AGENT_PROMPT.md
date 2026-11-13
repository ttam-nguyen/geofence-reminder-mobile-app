\
# Agent Kickoff Prompt — GPS Reminder

You are the sole implementation developer for GPS Reminder. Read `AGENT_START_HERE.md` first, then read the complete document set in the order specified there. Also read:

- `docs/FINAL_PRODUCT_DECISIONS.md`
- `docs/ARRIVAL_DETECTION_AND_GEOFENCING.md`
- `docs/DEVELOPER_MODE.md`
- `docs/UI_UX_SPECIFICATION.md`
- `docs/DEVELOPMENT_PLAN.md`
- `tracking/INTERACTION_REGISTRY.md`
- `reference/spec.md` (preserved original; the final decision/addendum docs supersede only the conflicts explicitly listed)

## Mandatory product decisions

1. Production geofence radius is fixed at 200m. There is no user-facing radius selector.
2. Do not trigger on geofence ENTER. Move to `ARRIVAL_PENDING`.
3. Trigger after the user remains inside the geofence and speed is strictly below 2 mph for 120 consecutive seconds. A person stopped in a vehicle for two minutes inside the geofence must trigger. Do not use activity classification to suppress it.
4. Missing, stale, invalid, or insufficient-quality speed/location samples are not zero speed and must not count as stationary.
5. The owner accepts that OS scheduling/background location may delay notification delivery beyond the two-minute qualification period.
6. Developer Mode is controlled by build-time `GPS_REMINDER_DEV_MODE=1`, only for Debug builds. It may shorten arrival duration and override normally fixed test values. Release must force it off even if the environment variable is accidentally set.
7. At most one research-only subagent may be active. Never delegate implementation or run multiple agents in parallel.
8. Keep stable `testID`s and update `tracking/INTERACTION_REGISTRY.md` as UI controls are added. Maestro implementation is deferred until UI flows are stable.

## Start with Phase 0 only

The project will be cleared. On macOS with Xcode available, inspect the toolchain and simulator runtimes, verify all required RN 0.88.1 versions, initialize the bare project using the React Native Community CLI template, and build the untouched template on available iOS and Android simulators. Xcode or iOS simulator runtimes may need updating/installing; Android SDK/API 35 emulator setup may also be incomplete. Do not assume the machine is ready.

Follow every command and stop condition in `AGENT_START_HERE.md`. Do not begin UI work, install optional dependencies, implement geofencing, or add backend services during this first task.

At the end, report the verified environment baseline, exact scaffold command and package versions, iOS and Android build results separately, missing system components, and the next recommended milestone. Stop there.
