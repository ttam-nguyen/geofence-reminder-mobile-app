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
| GEO-01 | Geofence registration | Not started | Not started | Physical device required |
| GEO-02 | WAITING_FOR_EXIT → ARMED | Not started | Not started | Physical device required |
| GEO-03 | ARMED → TRIGGERED exactly once | Not started | Not started | Physical device required |
| GEO-04 | Registration recovery after restart | Not started | Not started | Physical device required |
| GEO-05 | Permission revocation handling | Not started | Not started | |
| E2E-01 | Maestro create/edit/delete flow | Not started | Not started | After UI freeze |

| ARR-01 | Production geofence radius fixed at 200m; no user radius control | Not started | Not started | |
| ARR-02 | No trigger immediately on ENTER; transition to ARRIVAL_PENDING | Not started | Not started | |
| ARR-03 | Trigger after 120 consecutive seconds below 2 mph while inside | Not started | Not started | Physical-device validation |
| ARR-04 | At/above 2 mph resets stationary timer without leaving pending state | Not started | Not started | |
| ARR-05 | Geofence EXIT cancels candidate and returns to ARMED | Not started | Not started | |
| ARR-06 | Invalid/missing/stale speed is never treated as zero | Not started | Not started | |
| DEV-01 | `GPS_REMINDER_DEV_MODE=1` exposes dev tools in Debug build | Not started | Not started | |
| DEV-02 | Dev arrival duration can be shortened for tests | Not started | Not started | |
| DEV-03 | Dev radius/speed/quality overrides do not change production defaults | Not started | Not started | |
| DEV-04 | Release build hard-disables dev mode even if environment flag is set | Not started | Not started | Release-build verification |
| DEV-05 | Simulated geofence events are labeled and never counted as real-device validation | Not started | Not started | |
