\
# Final Product Decisions — GPS Reminder

**Decision snapshot:** 2026-11-12. These decisions were confirmed by the product owner in conversation and supersede conflicting details in the preserved original spec.

## 1. Platforms

- Framework baseline: React Native 0.88.1 stable, subject to a fresh compatibility check when Phase 0 runs.
- Test environments: iOS 27 and Android 15 (API 35).
- Minimum platform versions follow the selected RN baseline: iOS 15.1 and Android min SDK 24, unless the owner explicitly changes the support policy. These are minimum build/runtime requirements, not the requested test versions.

## 2. Arrival zone

- Production geofence radius: **200 meters, fixed**.
- Users cannot select or edit the radius.
- Show the radius as read-only information in Create Reminder, Detail, and map previews.
- Developer Mode may override the radius in Debug builds for test purposes only.

## 3. Arrival trigger

A reminder must not trigger on the initial geofence ENTER event.

The reminder triggers after the device has remained inside its geofence while moving at a speed **strictly below 2 mph** for **120 consecutive seconds**.

Conversions:
- 2 mph = approximately 0.89408 meters per second.
- Production duration = 120,000 milliseconds.

The user explicitly accepts that the notification may arrive later than the two-minute mark because the operating system controls background scheduling and location callback delivery.

## 4. No activity classification

- Do not require walking, vehicle, automotive, or human activity recognition.
- A person stopped in a vehicle for two minutes inside the geofence qualifies and should receive the reminder.
- A traffic-light stop of at least two qualifying minutes inside the geofence also qualifies by design.
- Do not add a rule that suppresses reminders merely because the user is inside a vehicle.

## 5. State machine change

Add `ARRIVAL_PENDING`:

- `ARMED + ENTER → ARRIVAL_PENDING`
- `ARRIVAL_PENDING + qualifying stationary duration complete → TRIGGERED`
- `ARRIVAL_PENDING + EXIT → ARMED`
- While still inside, speed at/above 2 mph resets the stationary-duration counter; the reminder remains `ARRIVAL_PENDING` and may start a new stationary window after speed drops below the threshold again.
- Invalid/stale/insufficient-quality readings do not count as stationary. Use a documented grace/reset strategy; never convert missing speed to zero.
- `TRIGGERED` remains terminal and exactly one notification may be delivered for that reminder.

`WAITING_FOR_EXIT` behavior remains unchanged: if a reminder is created while the user is already within its target region, it waits for an exit before becoming armed.

## 6. Geofence capacity

- iOS: maximum 20 monitored regions per app.
- Android: maximum 100 active geofences per app per device user according to current Android documentation.
- Use a shared priority policy, but honor each platform's actual capacity. The original spec's Android limit of 500 is superseded.

## 7. Offline-first

Creating, reading, editing, deleting, monitoring, and notifying about saved reminders must not require a backend or continuous internet connectivity. Map tiles and place search may require internet and must fail gracefully.

## 8. Developer Mode

Developer Mode is a build-time, environment-variable-gated facility for test builds only. Its definitive rules are in `docs/DEVELOPER_MODE.md`. It must not be exposed in Release builds.
