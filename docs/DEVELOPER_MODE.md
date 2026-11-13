\
# Developer Mode — Build-Time Test Overrides

## 1. Purpose

Developer Mode exists exclusively to shorten development/testing cycles and inspect arrival detection. It must not be available to normal users and must not alter production behavior.

The mode is enabled by a **build-time environment variable**, not an in-app production switch:

```bash
GPS_REMINDER_DEV_MODE=1 npm run ios
GPS_REMINDER_DEV_MODE=1 npm run android
```

The exact npm scripts may be added after the RN CLI scaffold is initialized. The agent must verify that the environment value is actually embedded into the native build and exposed to JS; React Native does not automatically expose arbitrary shell environment variables to application JavaScript.

## 2. Hard safety gates

Developer mode is enabled only when all of these are true:

1. The native app was compiled as a Debug/development build.
2. The native build-time configuration contains `GPS_REMINDER_DEV_MODE=1`.
3. The React Native runtime is in development mode (`__DEV__ === true`).

If any condition is false or unknown, Developer Mode is **disabled** (fail closed).

Release builds must hardcode/force the native developer-mode constant to false even if the shell environment accidentally contains `GPS_REMINDER_DEV_MODE=1`. The developer route, controls, event injection hooks, and diagnostic overlay must not be reachable in a Release build. Add an automated release-build check or native unit test for this condition.

Do not rely on hiding a UI row alone. The domain/native layers must also reject developer overrides when the build is not a permitted Debug build.

## 3. Build-time configuration and command shape

The intended developer workflow is:

```bash
# Normal debug build, production behavior values
npm run ios
npm run android

# Debug build with Developer Tools enabled
GPS_REMINDER_DEV_MODE=1 npm run ios
GPS_REMINDER_DEV_MODE=1 npm run android

# Release builds always force dev mode off
npm run ios:release
npm run android:release
```

Optional build-time test defaults may be supplied with environment variables:

```bash
GPS_REMINDER_DEV_MODE=1 \
GPS_REMINDER_DEV_STATIONARY_SECONDS=10 \
GPS_REMINDER_DEV_GEOFENCE_RADIUS_METERS=100 \
GPS_REMINDER_DEV_SPEED_THRESHOLD_MPH=2 \
GPS_REMINDER_DEV_MAX_SAMPLE_GAP_SECONDS=15 \
GPS_REMINDER_DEV_MAX_HORIZONTAL_ACCURACY_METERS=50 \
npm run android
```

These are **build-time defaults**, not secrets. Do not commit a local `.env` file containing developer flags. Provide a committed `.env.example` (or `docs/DEV_BUILD_EXAMPLE.md`) with `GPS_REMINDER_DEV_MODE=0`, and add actual local env files to `.gitignore` if an env-file workflow is selected.

The implementation must use a reliable native/build-time configuration path. Options include project-owned generated constants/native build settings or a verified environment-configuration library. Do not assume `process.env` works in Metro at runtime. Avoid adding a dependency solely for this if native build settings can do it cleanly.

## 4. Developer screen

When the gate is active, Settings displays a separate `Developer Tools` row with a visible `DEV` badge. The screen must show `DEV BUILD — TEST VALUES ONLY` near the top.

Initial developer defaults:

| Value | Production | Developer default | Suggested dev range |
|---|---:|---:|---:|
| Stationary confirmation duration | 120 sec | 10 sec | 1–120 sec |
| Geofence radius | 200 m | 100 m | 25–500 m |
| Speed threshold | 2 mph | 2 mph | 0.5–15 mph |
| Maximum location sample gap | Defined/validated in Phase 8 | 15 sec | 5–120 sec |
| Maximum horizontal accuracy | Defined/validated in Phase 8 | 50 m | 5–200 m |

These development defaults are for faster controlled testing; they are not claims that small geofence radii or short sample windows are reliable in real-world production conditions. The production values remain fixed and unaffected.

The developer screen should provide:
- stationary confirmation duration control,
- geofence radius override,
- speed threshold override,
- maximum sample gap override,
- maximum accepted horizontal accuracy override,
- current effective values summary,
- reset-to-developer-defaults action,
- clearly labeled simulated geofence ENTER and EXIT controls for deterministic integration tests,
- diagnostic readout for last native event, current state, last valid speed, speed accuracy when available, horizontal accuracy, and stationary time accumulated.

Any simulation UI must say `SIMULATED EVENT` and must not be represented as a physical geofence validation result.

## 5. Persistence of developer overrides

Developer overrides may persist between app launches in the local development app sandbox for convenience. Keep them in a separate dev-only namespace/storage record. Do not migrate them into production user settings, export them with user reminder data, or let them overwrite the production configuration.

If the flag is turned off and the app is rebuilt, developer overrides must be ignored. Re-enabling developer mode may restore a dev-only saved profile, but the app must clearly show which values are active.

## 6. Domain configuration design

Do not scatter `if (__DEV__)` checks throughout business logic. Inject a validated `ArrivalVerificationConfig` into the arrival qualifier / service. For example:

```ts
export interface ArrivalVerificationConfig {
  geofenceRadiusMeters: number;
  speedThresholdMetersPerSecond: number;
  stationaryDurationMs: number;
  maxSampleGapMs: number;
  maxHorizontalAccuracyMeters: number;
}
```

Create immutable production defaults and a dev-only resolver that validates and clamps values to the allowed test ranges. The service receives one resolved config object. Unit tests pass explicit configs directly without needing an environment variable or native build.

The build gate, value resolver, and native bridge must fail closed. A missing/invalid build flag must never enable dev settings.

## 7. Test requirements

- Debug without `GPS_REMINDER_DEV_MODE=1`: no Developer Tools route; production values active.
- Debug with `GPS_REMINDER_DEV_MODE=1`: Developer Tools visible and values configurable.
- Debug with invalid environment values: clamp/reject and show safe defaults; never crash.
- Release with `GPS_REMINDER_DEV_MODE=1`: Developer Tools absent; effective config is production; test injection unavailable.
- Unit tests can pass a 10-second duration to the arrival service and prove the same logic that production runs at 120 seconds.
- Simulated events are labeled and do not satisfy physical-device acceptance criteria.
- Turning off developer mode and rebuilding returns to production settings.
