# Acceptance Matrix

Use only these statuses: `Not started`, `In progress`, `Verified on simulator`, `Verified on physical device`, `Blocked`.

Status is per platform. "Verified on physical device" means observed on real hardware, not inferred
from unit tests. iOS has no test device and no working toolchain on the build machine (K-014), so
iOS rows are `Blocked` or `In progress` and must not be read as validated.

| ID | Requirement | iOS status | Android status | Evidence / notes |
|---|---|---|---|---|
| ENV-01 | Clean RN template builds | Blocked | Verified on physical device | Android: `app:assembleRelease` and `app:compileDebugKotlin` succeed; APK installs and runs. iOS: Xcode 26.3 Swift toolchain failure (K-014). |
| UI-01 | Bottom tab navigation | In progress | Verified on physical device | Tabs Home / Map / Settings with headers; tab bar clears the system navigation bar (explicit height + 16 dp gap, inset added when reported). |
| UI-02 | Home dashboard and empty state | In progress | Verified on physical device | FlatList of reminder cards, filter pills, search field, empty/loading states. |
| UI-03 | Create reminder form validation | In progress | Verified on physical device | `src/models/validation.ts` + unit tests; title/location required, error text inline. |
| UI-04 | Save mock reminder and open detail | In progress | Verified on physical device | SQLite persistence (`gps-reminder.db`), detail screen from card tap. No mock data since v1.0.0 (seeded rows purged). |
| UI-05 | Edit reminder | In progress | Verified on physical device | Overflow menu → edit route; status preserved unless the target changes. |
| UI-06 | Delete reminder with confirmation | In progress | Verified on physical device | `Alert.alert` confirmation in HomeScreen and ReminderDetailScreen; hard delete in `deleteById`. |
| UI-07 | List search and filters | In progress | Verified on physical device | Search input + All/Active/Waiting/Triggered/Completed filters. |
| UI-08 | Reminder status badges | In progress | Verified on physical device | Status label + colour per state on cards and detail. |
| UI-09 | Settings controls | In progress | Verified on physical device | Notification toggles, permission rows (including background location), diagnostics export, About with app version. |
| UI-10 | Accessibility labels and text scaling | In progress | In progress | testIDs and accessibility labels are in place on interactive elements. Text scaling is not audited yet — that is the deferred Phase 3 pass. |
| DATA-01 | Offline create/view/edit/delete | In progress | Verified on physical device | All writes go to SQLite; no network in the core path. |
| DATA-02 | Data survives app restart | In progress | Verified on physical device | Verified across update installs (`adb install -r`) and force-stops. Schema migration is additive and self-healing (column reconciliation). |
| LOC-01 | Current location selection | In progress | Verified on physical device | `Geolocation.getCurrentPosition` in create screen, reverse geocoded. |
| LOC-02 | Map pin selection | In progress | In progress | Pin mode with inline map exists in the create screen; not exercised on device yet. |
| NOTIF-01 | Local notification permission flow | In progress | Verified on physical device | notifee permission request on first launch; state shown in Settings. |
| NOTIF-02 | Local notification delivery | In progress | Verified on physical device | Arrival notification observed with the app closed (native DWELL path, Android). |
| GEO-01 | Geofence registration | Blocked | Verified on physical device | Android: `ENTER | EXIT | DWELL`, 200 m radius, 120 s loitering delay, registered geofences persisted by Play Services. Transitions persisted natively and drained by JS. iOS: Swift module exists but has no persisted queue and cannot be compiled here (K-018). |
| GEO-02 | WAITING_FOR_EXIT → ARMED | Blocked | Verified on physical device | Observed in the device log (`EXIT applied {status: WAITING_FOR_EXIT → ARMED}`). |
| GEO-03 | ARMED → TRIGGERED exactly once | Blocked | Verified on physical device | Observed `ARMED → ARRIVAL_PENDING → TRIGGERED` with `Arrival triggered {reason: native DWELL}` and a single notification. |
| GEO-04 | Registration recovery after restart | Blocked | Verified on physical device | An EXIT that happened 84 minutes before the app was opened was delivered and applied from the persisted queue. Geofences re-registered on start and on every resume. |
| GEO-05 | Permission revocation handling | Blocked | In progress | Permission snapshot logged on start and resume; background-location guard re-checks and prompts. Runtime revocation mid-session not exercised. |
| E2E-01 | Maestro create/edit/delete flow | Not started | Not started | Phase 9; depends on the interaction registry and a current acceptance matrix. |

| ARR-01 | Production geofence radius fixed at 200m; no user radius control | Blocked | Verified on physical device | Fixed 200 m in both native modules; no radius control in the UI. |
| ARR-02 | No trigger immediately on ENTER; transition to ARRIVAL_PENDING | Blocked | Verified on physical device | `ARMED → ARRIVAL_PENDING` on native ENTER; notification is not raised at that point. |
| ARR-03 | Trigger after 120 consecutive seconds below 2 mph while inside | Blocked | Verified on physical device | Two paths: native DWELL (loitering delay 120 s, presence-based, works with the app closed — see DECISIONS 2026-11-24) and the JS speed validation used while the app is in the foreground. |
| ARR-04 | At/above 2 mph resets stationary timer without leaving pending state | Blocked | In progress | Implemented and unit tested (`moving` verdict resets accumulation, candidate kept). Not reproduced on device with a deliberate walk/stop cycle. |
| ARR-05 | Geofence EXIT cancels candidate and returns to ARMED | Blocked | Verified on physical device | `ARRIVAL_PENDING → ARMED` observed on EXIT with the candidate cancelled. |
| ARR-06 | Invalid/missing/stale speed is never treated as zero | Blocked | In progress | Sample validation: age < 5 min, accuracy ≤ 50 m, gap ≤ 60 s; verdicts are logged (`stale`, `low-accuracy`, `gap-reset`). Unit tested; device confirmation pending. |
| DEV-01 | `GPS_REMINDER_DEV_MODE=1` exposes dev tools in Debug build | In progress | Verified on physical device | `isDeveloperMode()` requires `__DEV__` and the env flag; controls render in Settings. |
| DEV-02 | Dev arrival duration can be shortened for tests | In progress | In progress | `arrivalConfig.ts` supports overrides; not exercised on device. |
| DEV-03 | Dev radius/speed/quality overrides do not change production defaults | In progress | Verified on physical device | Production constants live in `arrivalConfig.ts` and the native modules; dev overrides are separate. |
| DEV-04 | Release build hard-disables dev mode even if environment flag is set | In progress | Verified on physical device | `isDeveloperMode()` returns false whenever `__DEV__` is false, so release builds cannot expose the dev screen. |
| DEV-05 | Simulated geofence events are labeled and never counted as real-device validation | In progress | Verified on physical device | Dev controls label events "SIMULATED"; this matrix counts only observed real-device events as evidence. |
