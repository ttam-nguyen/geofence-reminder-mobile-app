\
# Arrival Detection and Geofencing Specification

This is the normative implementation guide for geofence registration, arrival qualification, and reminder triggering.

## 1. Production constants

| Setting | Production value | User-editable? |
|---|---:|---|
| Geofence radius | 200 m | No |
| Stationary speed threshold | Strictly below 2 mph (0.89408 m/s) | No |
| Stationary confirmation duration | 120 consecutive seconds | No |
| Activity classification | Not used | N/A |
| Continuous GPS polling | Prohibited | N/A |

Developer builds may override these values only as described in `DEVELOPER_MODE.md`.

## 2. High-level event flow

1. Reminder is created and its target coordinates are persisted locally.
2. If the current position is inside/on the target boundary, use `WAITING_FOR_EXIT`; otherwise use `ARMED`.
3. Native geofence ENTER for an ARMED reminder moves it to `ARRIVAL_PENDING`. Do not notify yet.
4. Begin bounded arrival verification using native location updates and the platform's background execution mechanisms.
5. Count time only while the device is confirmed to be inside the target region and qualifying speed readings remain strictly below 2 mph.
6. When 120 consecutive seconds have been qualified, atomically transition to `TRIGGERED`, record the event, unregister the geofence, and schedule/deliver one local notification.
7. If the user exits before confirmation, cancel the candidate and return to `ARMED`.

## 3. Stationary qualification rules

### 3.1 Speed

- Threshold is `0.89408 m/s` (2 mph).
- Qualifying means strictly less than the threshold; `>= 2 mph` is non-qualifying.
- A location sample must be fresh, timestamp-valid, and sufficiently accurate.
- Missing, negative, invalid, stale, or low-confidence speed must never be interpreted as 0 mph.
- When a confidence/accuracy estimate is available, use it conservatively. If the uncertainty makes it impossible to establish that speed is below the threshold, the sample is indeterminate and must not advance the timer.
- Smooth/validate readings to avoid one noisy GPS spike causing false behavior, but do not silently count long periods with no evidence as stationary.

### 3.2 Duration

- The production stationary window is 120,000ms.
- The window starts when the user is inside and valid readings establish speed below the threshold.
- Qualifying samples must span the full duration; do not use a JavaScript timeout alone as proof of stationary status.
- Any reliable reading at or above the speed threshold resets the stationary window to zero while the user remains inside.
- A geofence EXIT cancels the arrival candidate and restores `ARMED`.
- If valid samples stop arriving, apply an explicit maximum sample-gap policy. Do not count unobserved gaps as stationary. The exact production gap tolerance must be documented and tuned in physical-device testing; expose it as a dev-only override.
- OS callback delay may make actual notification later than 120 seconds. This is accepted by the product owner.

### 3.3 Activity type

Do not require or infer a walking/vehicle classification. A stopped vehicle qualifies. A traffic-light stop lasting two minutes inside the geofence qualifies. This is intentional.

## 4. Platform implementation

### iOS

- Use Core Location region monitoring for the outer 200m boundary, with API availability handling appropriate for iOS 15.1+.
- On ENTER, transition to `ARRIVAL_PENDING`; use bounded Core Location updates while the candidate is being evaluated.
- `CLLocation.speed` is meters/second. `CLLocation.speedAccuracy` is also meters/second; a negative accuracy value means the speed is invalid.
- Stop high-accuracy updates as soon as the candidate is confirmed, cancelled, or times out. Avoid all-day continuous GPS updates.
- Background callback timing is controlled by iOS; a two-minute timer is a qualification target, not a delivery SLA.
- Keep the geofence registered/recovery logic separate from temporary location-update sessions.

### Android

- Use Google Play services Geofencing API with receiver/PendingIntent event handling.
- Android's native DWELL transition can be used as a supporting signal or wake-up optimization, but it is not a replacement for checking speed. Do not trigger based on DWELL alone.
- `Location.getSpeed()` is meters/second. `getSpeedAccuracyMetersPerSecond()` exists from API 26; for API 24–25 it is unavailable. Implement a conservative fallback (valid speed plus position-displacement/stability checks) and do not assume missing accuracy means perfect accuracy.
- Android currently allows 100 geofences per app per device user. The old product spec's 500 value must not be used.
- Re-register after reboot and other documented conditions; handle Play Services unavailable and permission revocation.

## 5. Idempotency and persistence

- Only one successful `ARRIVAL_PENDING → TRIGGERED` transition may occur per reminder.
- Persist transition/event before/with notification scheduling in a crash-safe order.
- Duplicate ENTER, DWELL, EXIT, or location callbacks must not produce duplicate notifications.
- Once `TRIGGERED`, ignore future geofence events. The user creates a new reminder to repeat.

## 6. Capacity and prioritization

- iOS: 20 monitored regions.
- Android: 100 geofences per app per device user.
- Registration manager calculates capacity separately per platform and prioritizes ARMED reminders above WAITING_FOR_EXIT; pending verification must be handled explicitly and must not be silently dropped without a recoverable state/UI explanation.

## 7. State transitions

| Current state | Event/condition | Next state | Action |
|---|---|---|---|
| `DRAFT` | Saved outside geofence | `ARMED` | Register geofence |
| `DRAFT` | Saved inside/on boundary | `WAITING_FOR_EXIT` | Wait for exit |
| `WAITING_FOR_EXIT` | EXIT | `ARMED` | Register for entry |
| `ARMED` | ENTER | `ARRIVAL_PENDING` | Start arrival qualification |
| `ARRIVAL_PENDING` | valid speed < 2 mph for 120s while inside | `TRIGGERED` | Notify once; unregister |
| `ARRIVAL_PENDING` | speed >= 2 mph while inside | `ARRIVAL_PENDING` | Reset stationary timer |
| `ARRIVAL_PENDING` | EXIT | `ARMED` | Cancel candidate; continue monitoring |
| `TRIGGERED` | any geofence/location event | `TRIGGERED` | Ignore duplicate events |

The full lifecycle still supports the product's pause/completion/deletion actions. Update the pure state-machine tests to cover every newly allowed and forbidden transition.

## 8. Test scenarios

1. Enter geofence at 25 mph, drive through: no notification.
2. Enter at 25 mph, stop at a traffic light for 30 seconds, resume: no notification; timer resets.
3. Enter at 25 mph, stop in traffic for 120 qualifying seconds: notification is expected, even in vehicle.
4. Enter at 25 mph, park, remain under 2 mph for 120 qualifying seconds: notification.
5. Walk into geofence and remain under threshold: notification after confirmation.
6. Speed is missing/invalid: no false stationary qualification.
7. Location sample becomes stale beyond configured maximum gap: timer does not progress across the gap.
8. Exit before duration completes: return to ARMED; no notification.
9. Duplicate ENTER/DWELL/locations: at most one notification.
10. App process interrupted during qualification: recover persisted state conservatively; do not count unknown elapsed time as proven stationary.
11. Permission revoked: stop claiming the reminder is being monitored and surface a clear status.
12. OS delays callbacks: notification may be late; verify eventual correct behavior rather than exact wall-clock punctuality.

## 9. Validation standard

Unit tests validate the deterministic state machine and qualifier. Simulator tests validate integration paths only. Background geofence behavior, stationary qualification, reboot recovery, and actual notification delivery must be validated on physical iOS and Android devices.
