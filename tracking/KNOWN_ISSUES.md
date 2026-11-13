# Known Issues and Risk Register

| ID | Risk / issue | Impact | Mitigation | Status |
|---|---|---|---|---|
| K-001 | RN 0.88.1 requires current native toolchain | Build blocked | Audit machine before scaffold; preserve generated versions | Open |
| K-002 | iOS 27 simulator runtime may not be installed | Cannot verify target iOS | Check Xcode runtimes and install if available | Open |
| K-003 | Android 15 API 35 is not the same as compile SDK 37 | Build config confusion | Use API 35 emulator, generated compile/target SDK | Open |
| K-004 | Platform geofence capacity | Some reminders not monitored | iOS 20 regions; Android 100 per app per device user; priority-based registration | Open |
| K-005 | Background location behavior differs by OS/vendor | Missed/delayed triggers | Real-device matrix and explicit limitations | Open |
| K-006 | Map SDK compatibility with RN New Architecture | Native build risk | Defer and run minimal two-platform spike | Open |
| K-007 | Fixed production radius and domain validation must stay aligned | Invalid saved data | Production radius is fixed at 200m; Developer Mode may override only in Debug | Open |
| K-008 | Public Nominatim has usage limits | Search may be throttled | Online-only, explicit user action, no autocomplete spam | Open |
| K-009 | Notifee version/platform behavior needs validation | Notification delivery risk | Test local notification separately before geofence | Open |
| K-010 | Background speed/location samples may be sparse or inaccurate | Arrival confirmation delayed or false-positive risk | Require valid samples, explicit sample-gap policy, and physical-device testing | Open |
| K-011 | Developer flag could accidentally leak into Release | Test-only behavior exposed in production | Native Release hard-disable plus `__DEV__` guard and release verification | Open |
