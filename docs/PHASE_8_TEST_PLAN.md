# Phase 8 Test Plan — Native Geofencing

**Purpose:** Physical-device test checklist for validating the full geofence lifecycle.
**Prerequisite:** Gate 7 passes (local notifications work on both platforms).
**Devices required:** At least one iOS device and one Android device (physical, not simulators/emulators).

---

## Pre-test checklist

- [ ] Gate 7 passes: notifications schedule/deliver/cancel on both devices.
- [ ] Both devices have location services enabled.
- [ ] Location permission granted for "When In Use" (or "Always" if requested).
- [ ] App is built as a Debug build (not Release).
- [ ] Both devices are on Wi-Fi (for faster builds and Play Services access).

---

## Test Block A — Geofence Registration (Foreground)

### A-01: Create a reminder and verify geofence is registered
**Steps:**
1. Open app, navigate to Create Reminder.
2. Select a location (current location or map pin).
3. Save the reminder (title: "Test A-01").
4. Navigate to Map screen.

**Expected:** The reminder appears as a colored marker on the map (color for `ARMED` status). No notification is delivered yet.

**Pass:** ✅ / ❌
**Notes:** ____________

### A-02: Verify geofence is NOT registered for inactive reminders
**Steps:**
1. Create a second reminder but mark it as `PAUSED` before saving (or save and immediately pause).
2. Observe the map — the paused reminder marker should be visible but visually distinct (if implemented).

**Expected:** No geofence is registered for paused/completed/cancelled reminders.

**Pass:** ✅ / ❌
**Notes:** ____________

---

## Test Block B — Geofence ENTER → ARRIVAL_PENDING

### B-01: Enter geofence while moving fast (≥ 2 mph)
**Steps:**
1. With Test A-01 reminder active, walk/drive away from the geofence area (at least 200m away).
2. Re-enter the geofence at walking speed or faster (≥ 2 mph).

**Expected:** The reminder status changes to `ARRIVAL_PENDING`. No notification is delivered. The stationary timer starts counting but does NOT count because speed ≥ 2 mph.

**Pass:** ✅ / ❌
**Notes:** ____________

### B-02: Enter geofence while stationary (walk in slowly)
**Steps:**
1. With Test A-01 reminder active, walk away from the geofence area (at least 200m away).
2. Walk back into the geofence at a normal walking pace (well under 2 mph).

**Expected:** The reminder status changes to `ARRIVAL_PENDING`. No notification is delivered yet. The stationary timer begins counting qualifying time (speed < 2 mph while inside).

**Pass:** ✅ / ❌
**Notes:** ____________

---

## Test Block C — Stationary Qualification (120 seconds)

### C-01: Remain stationary inside geofence for full 120 seconds
**Steps:**
1. After Test B-02 (reminder is in `ARRIVAL_PENDING`), stand still inside the geofence area.
2. Wait 120 seconds (use a timer/stopwatch).
3. Observe the reminder status on the Map screen and Home screen.

**Expected:** After 120 consecutive seconds of speed < 2 mph while inside the geofence, the reminder transitions to `TRIGGERED`. A notification is delivered (or scheduled for immediate delivery). The geofence is unregistered.

**Pass:** ✅ / ❌
**Notes:** ____________

### C-02: Speed exceeds 2 mph during stationary window
**Steps:**
1. After Test B-02 (reminder is in `ARRIVAL_PENDING`), stand still for ~60 seconds.
2. Start walking/jogging at a pace that produces speed ≥ 2 mph (move briskly).
3. Continue for ~30 seconds, then stop again.

**Expected:** The stationary timer RESETS to zero when speed ≥ 2 mph. The reminder stays in `ARRIVAL_PENDING`. When you stop again, the timer resumes counting from zero (not from where it left off).

**Pass:** ✅ / ❌
**Notes:** ____________

### C-03: Exit geofence before 120 seconds completes
**Steps:**
1. After Test B-02 (reminder is in `ARRIVAL_PENDING`), stand still for ~60 seconds.
2. Walk out of the geofence area (beyond 200m from the target coordinates).

**Expected:** The reminder transitions back to `ARMED`. No notification is delivered. The stationary timer is cancelled. A new geofence registration is active (waiting for re-entry).

**Pass:** ✅ / ❌
**Notes:** ____________

---

## Test Block D — Idempotency and Edge Cases

### D-01: Duplicate ENTER events do not produce duplicate notifications
**Steps:**
1. Create a new reminder (Test D-01).
2. Enter the geofence, wait for `ARRIVAL_PENDING`.
3. Exit and re-enter the geofence quickly (before 120 seconds).

**Expected:** The reminder returns to `ARMED` on exit, then back to `ARRIVAL_PENDING` on re-entry. The stationary timer resets. At most one notification is ever delivered for this reminder (when it reaches `TRIGGERED`).

**Pass:** ✅ / ❌
**Notes:** ____________

### D-02: Reminder can be completed/completed while in ARRIVAL_PENDING
**Steps:**
1. After Test B-02 (reminder is in `ARRIVAL_PENDING`), use the UI to complete or delete the reminder.

**Expected:** The geofence is unregistered. No notification is delivered. The reminder status becomes `COMPLETED` or `CANCELLED`.

**Pass:** ✅ / ❌
**Notes:** ____________

---

## Test Block E — Platform-Specific Tests

### E-01: iOS — Cold start re-registers geofences
**Steps:**
1. Create a reminder (Test E-01).
2. Force-kill the app (swipe away from app switcher).
3. Reopen the app.
4. Navigate to Map screen and verify the reminder is still visible as `ARMED`.

**Expected:** The geofence for this reminder is re-registered on cold start. The reminder retains its `ARMED` status.

**Pass:** ✅ / ❌
**Notes:** ____________

### E-02: Android — Cold start re-registers geofences
**Steps:** Same as E-01 but on Android device.

**Expected:** The geofence for this reminder is re-registered on cold start.

**Pass:** ✅ / ❌
**Notes:** ____________

### E-03: iOS — Permission revoked handling
**Steps:**
1. Create a reminder (Test E-03).
2. Go to device Settings → Privacy → Location Services → GPS Reminder.
3. Change permission to "Never" or "Ask Next Time".
4. Return to the app and observe the Map/Home screen.

**Expected:** The app handles the permission change gracefully. No crash. A clear status is shown (e.g., "Location access required"). Affected reminders return to `ARMED` or `DRAFT`.

**Pass:** ✅ / ❌
**Notes:** ____________

### E-04: Android — Permission revoked handling
**Steps:** Same as E-03 but on Android device.

**Expected:** The app handles the permission change gracefully. No crash. A clear status is shown.

**Pass:** ✅ / ❌
**Notes:** ____________

### E-05: Android — Google Play Services unavailable (if applicable)
**Steps:** On an Android device without Google Play Services (e.g., Huawei), open the app and create a reminder.

**Expected:** The app reports gracefully that geofencing is unavailable. No crash. Reminders can still be created/saved (just not monitored).

**Pass:** ✅ / ❌
**Notes:** ____________

---

## Test Block F — Developer Mode (Dev Builds Only)

### F-01: Developer Tools visible in dev builds
**Steps:** Build with `GPS_REMINDER_DEV_MODE=1`. Open Settings.

**Expected:** A "Developer Tools" row is visible in Settings. It shows a `DEV BUILD — TEST VALUES ONLY` label and current effective config values.

**Pass:** ✅ / ❌
**Notes:** ____________

### F-02: Developer Tools absent in release builds
**Steps:** Build a Release build. Open Settings.

**Expected:** No "Developer Tools" row is visible. The effective config uses production values (200m radius, 120s stationary, 2 mph speed threshold).

**Pass:** ✅ / ❌
**Notes:** ____________

### F-03: Simulated ENTER/EXIT controls work
**Steps:** In Developer Tools, tap "Simulate ENTER" for an `ARMED` reminder. Observe the status change. Tap "Simulate EXIT".

**Expected:** The reminder transitions to `ARRIVAL_PENDING` on simulated ENTER, and back to `ARMED` on simulated EXIT. The UI clearly labels these as `SIMULATED EVENT`. These events do NOT satisfy physical-device acceptance criteria (for Gate 8).

**Pass:** ✅ / ❌
**Notes:** ____________

---

## Test Block G — Capacity Limits

### G-01: iOS — 20-region limit handling
**Steps:** On an iOS device, create 21 reminders (all `ARMED` status).

**Expected:** The app handles the 21st registration gracefully. Prioritizes `ARMED` reminders over `WAITING_FOR_EXIT`. Shows a capacity warning (non-blocking) in the UI.

**Pass:** ✅ / ❌
**Notes:** ____________

### G-02: Android — 100-geofence limit handling
**Steps:** On an Android device, create 101 reminders (all `ARMED` status).

**Expected:** The app handles the 101st registration gracefully. Prioritizes `ARMED` reminders. Shows a capacity warning (non-blocking) in the UI.

**Pass:** ✅ / ❌
**Notes:** ____________

---

## Summary

| Block | Tests | Pass Count | Fail Count | Notes |
|---|---|---|---|---|
| A — Registration | 2 | | | |
| B — ENTER → ARRIVAL_PENDING | 2 | | | |
| C — Stationary Qualification | 3 | | | |
| D — Idempotency | 2 | | | |
| E — Platform-Specific | 5 | | | |
| F — Developer Mode | 3 | | | |
| G — Capacity Limits | 2 | | | |
| **TOTAL** | **19** | | | |

**Gate 8 passes if:** All Block A–E tests pass, and at least Blocks F–G pass (or failures are documented with known-limitations rationale).

**Status:** Not started
**Tested on device(s):** ____________
**Date tested:** ____________
