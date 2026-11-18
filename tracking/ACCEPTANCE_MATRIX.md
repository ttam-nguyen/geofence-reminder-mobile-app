# Acceptance Matrix

Use only these statuses: `Not started`, `In progress`, `Verified on simulator`, `Verified on physical device`, `Blocked`.

| ID | Requirement | iOS status | Android status | Evidence / notes |
|---|---|---|---|---|
| ENV-01 | Clean RN template builds | Not started | Not started | |
| UI-01 | Bottom tab navigation | Not started | Not started | |
| UI-02 | Home dashboard and empty state | Not started | Not started | |
| UI-03 | Create reminder form validation | Not started | Not started | |
| UI-04 | Save mock reminder and open detail | Not started | Not started | |
| UI-05 | Edit reminder | Not started | Not started | |
| UI-06 | Delete reminder with confirmation | Not started | Not started | |
| UI-07 | List search and filters | Not started | Not started | |
| UI-08 | Reminder status badges | Not started | Not started | |
| UI-09 | Settings controls | Not started | Not started | |
| UI-10 | Accessibility labels and text scaling | Not started | Not started | |
| DATA-01 | Offline create/view/edit/delete | Not started | Not started | |
| DATA-02 | Data survives app restart | Not started | Not started | |
| LOC-01 | Current location selection | Not started | Not started | |
| LOC-02 | Map pin selection | Not started | Not started | |
| NOTIF-01 | Local notification permission flow | Not started | Not started | |
| NOTIF-02 | Local notification delivery | Not started | Not started | |
| GEO-01 | Geofence registration | In progress | In progress | Native modules implemented (iOS CoreLocation + Android Geofencing API). Unit tests pass. Physical device testing pending. |
| GEO-02 | WAITING_FOR_EXIT → ARMED | In progress | In progress | State machine transition implemented. Physical device testing pending. |
| GEO-03 | ARMED → TRIGGERED exactly once | In progress | In progress | State machine enforces terminal TRIGGERED. Crash-safety persistence implemented. Physical device testing pending. |
| GEO-04 | Registration recovery after restart | In progress | In progress | Cold-start reconciliation implemented (registerAllActiveGeofences). Crash-safety resumeStationaryTimer implemented. Physical device testing pending. |
| GEO-05 | Permission revocation handling | In progress | In progress | setOnPermissionChange callback implemented. Physical device testing pending. |
| E2E-01 | Maestro create/edit/delete flow | Not started | Not started | After UI freeze |

| ARR-01 | Production geofence radius fixed at 200m; no user radius control | In progress | In progress | Fixed 200m in both native modules (iOS CLCircularRegion + Android Geofence.Builder). |
| ARR-02 | No trigger immediately on ENTER; transition to ARRIVAL_PENDING | In progress | In progress | State machine + geofencingService handles ARMED → ARRIVAL_PENDING on native ENTER event. |
| ARR-03 | Trigger after 120 consecutive seconds below 2 mph while inside | In progress | In progress | stationaryService.ts implements 120s window with <0.89408 m/s threshold. Unit tests: 19/19 PASS. |
| ARR-04 | At/above 2 mph resets stationary timer without leaving pending state | In progress | In progress | stationaryService handles speed reset. Unit tests verify reset behavior. |
| ARR-05 | Geofence EXIT cancels candidate and returns to ARMED | In progress | In progress | handleNativeExit() calls cancelArrivalCandidate + stateMachine.transition(ARRIVAL_PENDING, EXIT). |
| ARR-06 | Invalid/missing/stale speed is never treated as zero | In progress | In progress | stationaryService validates samples (timestamp <5min, horizontalAccuracy ≤50m). |
| DEV-01 | `GPS_REMINDER_DEV_MODE=1` exposes dev tools in Debug build | In progress | In progress | DeveloperGeofenceControls.tsx integrated into SettingsScreen, visible only when isDeveloperMode(). |
| DEV-02 | Dev arrival duration can be shortened for tests | In progress | In progress | arrivalConfig.ts injectable defaults (dev: 10s). |
| DEV-03 | Dev radius/speed/quality overrides do not change production defaults | In progress | In progress | arrivalConfig.ts separates dev and production configs. |
| DEV-04 | Release build hard-disables dev mode even if environment flag is set | In progress | In progress | build.gradle GPS_REMINDER_DEV_MODE defaults to false in release. |
| DEV-05 | Simulated geofence events are labeled and never counted as real-device validation | In progress | In progress | DeveloperGeofenceControls labels events as "SIMULATED" with warning. |
