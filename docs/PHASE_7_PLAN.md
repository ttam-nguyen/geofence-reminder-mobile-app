# Phase 7 — Local Notifications

**Goal:** Prove local notifications independently of geofencing.
**Start condition:** Gate 6 passes (map + foreground location works on physical devices).
**Duration estimate:** 3–5 days on physical devices (permission dialogs, OS background policies add variance).

---

## 1. What Phase 6 left us with

| Area | Status | Files |
|---|---|---|
| Navigation shell (bottom tabs + stack) | ✅ Complete | `src/navigation/AppNavigator.tsx` |
| All 7 screens (Home, Map, Settings, CreateReminder, Detail, ReminderDetail, Onboarding) | ✅ Complete with mock data | `src/screens/*.tsx` |
| Domain model (state machine, validation, haversine) | ✅ Complete | `src/models/stateMachine.ts`, `validation.ts`, `haversine.ts` |
| Arrival verification config (dev-mode injectable) | ✅ Complete | `src/models/arrivalConfig.ts` |
| SQLite persistence (OP-SQLite) | ✅ Complete | `src/models/sqliteAdapter.ts` |
| Map with real react-native-maps + markers | ✅ Complete | `src/screens/MapScreen.tsx` |
| Location permissions via @react-native-community/geolocation | ✅ Complete | AndroidManifest.xml, Info.plist entries |
| ReminderRepository interface + InMemory/SQLite adapters | ✅ Complete | `src/models/repository.ts`, `sqliteAdapter.ts` |
| Zustand stores (reminderStore, settingsStore) | ✅ Complete | `src/stores/reminderStore.ts`, `settingsStore.ts` |
| Theme tokens (Graphite/Glass) | ✅ Complete | `src/theme/index.ts` |

**Gap:** Settings has notification *toggles* (UI only) — no actual notification delivery, scheduling, or permission handling.

---

## 2. Library decision: notifee

### Candidate evaluation

| Criterion | `@notifee/react-native` v8.x | Native module (homegrown) |
|---|---|---|
| RN 0.88 compatibility | Documents Fabric/New Architecture support; v8.x is current stable | Would need full iOS + Android native code |
| License | Apache 2.0 (free) | N/A |
| Feature set | Local notifications, scheduled, triggered (geofence/time/location), channels, sound, vibration, custom UI | Full control but 2x native code |
| Maintenance | Active (notifee.app); large install base | N/A |
| API key / paid | None required | N/A |
| Compatibility risk | Low — well-tested across RN versions | High — custom native code on RN 0.88 New Architecture is untested territory |
| Time to integrate | ~1–2 days spike + 2–3 days implementation | ~5–7 days minimum |

**Decision:** Use `@notifee/react-native` v8.x. The risk is lower, it already supports Fabric/New Architecture, and the feature set covers everything Phase 7 needs. A homegrown native module for notifications alone is overkill — the geofencing phase (Phase 8) will need a custom native module anyway, but notifications are a solved problem.

### Compatibility verification (spike)

Before installing in the app:

```bash
# 1. Check notifee's current version and RN 0.88 compatibility
npx npm info @notifee/react-native version
npx npm info @notifee/react-native peerDependencies

# 2. Quick build test in a temporary branch:
npx @react-native-community/cli@latest init NotifeeSpike --version 0.88.1
cd NotifeeSpike && npm install @notifee/react-native --save
cd ios && bundle exec pod install
cd ../android && ./gradlew app:assembleDebug
# If this passes, we know notifee links on RN 0.88 New Architecture.
```

**Rollback:** If notifee fails to link on RN 0.88 New Architecture, fall back to the OS native APIs directly:
- iOS: `UNUserNotificationCenter` (iOS 10+, available since RN 0.60)
- Android: `NotificationManager` with `NotificationCompat.Builder` (API 24+)

These are already available through React Native's native modules. We would write a thin TypeScript interface + two small native modules (one per platform). This is the fallback path, not the primary choice.

---

## 3. Files to create and modify

### New files

```
src/services/
  notificationService.ts        # TypeScript interface + notifee implementation
  notificationService.test.ts   # Unit tests (mocked notifee)

src/components/
  NotificationPermissionBanner.tsx  # Permission-education UI (used in Settings + Onboarding)
```

### Modified files

```
package.json                          # Add @notifee/react-native
android/app/src/main/AndroidManifest.xml  # Declare notification permissions (POST_NOTIFICATIONS on Android 13+)
ios/GPSReminder/Info.plist            # Add NSUserNotificationsUsageDescription (may already exist)
src/screens/SettingsScreen.tsx        # Wire notification toggles to actual service; add permission status
src/screens/OnboardingScreen.tsx      # Add notification-permission step (Phase 6 deferred onboarding)
src/stores/settingsStore.ts           # Persist notification preferences; read from service on init
```

### Optional (if onboarding was not built in Phase 2)

```
src/screens/OnboardingScreen.tsx      # Create if not already present (3-step: intro, location perm, notification perm)
```

---

## 4. Step-by-step tasks

### Task 7.1 — Compatibility spike (0.5 day)

**Goal:** Verify `@notifee/react-native` links on RN 0.88 New Architecture.

Steps:
1. Check current stable version and peer dependencies via `npm info`.
2. Create a temporary spike project (or use an existing clean scaffold).
3. Install `@notifee/react-native`.
4. Run `pod install` (iOS) and `./gradlew app:assembleDebug` (Android).
5. Record results in `docs/DECISIONS.md`.

**Gate 7.1:** Build succeeds on both platforms, or a precise blocker is documented with fallback plan.

### Task 7.2 — Install and configure notifee (0.5 day)

**Goal:** Add notifee to the project with correct native configuration.

Steps:
1. Clean install: `rm -rf node_modules package-lock.json && npm install @notifee/react-native`
2. Verify Android build: `cd android && ./gradlew app:assembleDebug` (record in long-term memory).
3. Verify iOS build: `cd ios && bundle exec pod install`.
4. Add notification usage description to `Info.plist` if not present:
   ```xml
   <key>NSUserNotificationsUsageDescription</key>
   <string>We send you a reminder when you arrive at the selected location.</string>
   ```
5. Add Android `POST_NOTIFICATIONS` permission (API 33+) to `AndroidManifest.xml`:
   ```xml
   <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
   <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
   <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
   ```

**Gate 7.2:** Both platforms build without errors after adding the dependency.

### Task 7.3 — Notification service layer (1 day)

**Goal:** Create a clean TypeScript interface with notifee implementation, independent of UI.

Create `src/services/notificationService.ts`:

```typescript
/** Core notification service interface — independent of notifee internals. */
export interface NotificationService {
  /** Request notification permission. Returns the current authorization status. */
  requestPermission(): Promise<AuthorizationStatus>;

  /** Check current notification permission status. */
  checkPermission(): Promise<AuthorizationStatus>;

  /** Schedule a local notification that fires immediately or at a future time. */
  scheduleNotification(notification: ScheduledNotification): Promise<string>;

  /** Display a local notification (immediate). */
  displayNotification(notification: DisplayedNotification): Promise<string>;

  /** Cancel a specific notification by ID. */
  cancelNotification(notificationId: string): Promise<void>;

  /** Cancel all notifications. */
  cancelAllNotifications(): Promise<void>;

  /** Get a list of all scheduled/displayed notification IDs. */
  getScheduledNotifications(): Promise<ScheduledNotification[]>;

  /** Create or update an Android notification channel. */
  createChannel(channel: NotificationChannel): Promise<string>;

  /** Get all notification channels. */
  getChannels(): Promise<NotificationChannel[]>;
}

export type AuthorizationStatus =
  | 'unspecified'
  | 'denied'
  | 'authorized'
  | 'provisional'
  | 'ephemeral';

export interface ScheduledNotification {
  id: string;
  title: string;
  body?: string;
  data?: Record<string, string>;  // e.g., { reminderId: 'xxx' }
  android?: { channelId?: string; sound?: string | null; importance?: number };
  ios?: { sound?: string | null };
  trigger?: 'immediate' | { timestamp: number };  // immediate or future timestamp
}

export interface DisplayedNotification extends Omit<ScheduledNotification, 'trigger'> {
  trigger: 'immediate';
}

export interface NotificationChannel {
  id: string;
  name: string;
  description?: string;
  sound?: string | null;
  vibrationPattern?: number[];
  importance?: number;  // 0–4, Android only
}
```

Implementation wraps `@notifee/react-native` API calls. The interface abstracts away notifee internals so that:
- Unit tests can mock the service without notifee's native dependencies.
- A fallback native implementation could be swapped in later if notifee proves incompatible.

**Gate 7.3:** TypeScript compiles cleanly. Unit tests pass (mocked service).

### Task 7.4 — Android notification channels + iOS sound config (0.5 day)

**Goal:** Ensure notifications produce sound and vibration on both platforms.

Steps:
1. Create a default Android notification channel via `notificationService.createChannel()`:
   - ID: `gps_reminder_default`
   - Name: "GPS Reminders"
   - Sound: default system sound (or custom `reminder.mp3` if added to `android/app/src/main/res/raw/`)
   - Vibration: default pattern
2. On iOS, ensure the notification includes `sound: 'default'` in the payload.
3. Add a custom sound file `reminder.mp3` to both platforms' native resources (optional — default system sound is acceptable for MVP).
4. Test that a notification produces sound on both simulators and real devices.

**Gate 7.4:** A scheduled notification plays sound and vibrates on both iOS and Android real devices.

### Task 7.5 — Permission UI integration (0.5 day)

**Goal:** Wire notification permissions to the Settings screen and onboarding.

Steps:
1. In `SettingsScreen.tsx`:
   - Read notification permission status from `notificationService.checkPermission()`.
   - Display current status: "Notifications On", "Notifications Off — tap to enable", or "Denied — open Settings".
   - The existing sound/vibration toggles now call `notificationService` methods to configure the active channel.
   - Add a "Request Permission" button when status is "unspecified".
2. In `OnboardingScreen.tsx` (if built): Add a notification-permission step that educates the user and calls `requestPermission()`.
3. Handle denied permission gracefully: show a "Open Settings" link that opens the OS settings screen (not a crash).

**Gate 7.5:** Permission dialog appears on first request. Denied state shows a non-crashing fallback UI with a link to OS settings.

### Task 7.6 — Manual test notification from Settings (0.5 day)

**Goal:** A "Send Test Notification" button in Settings that delivers an immediate notification.

Steps:
1. Add a "Send Test Notification" button to the Settings screen (below the notification toggles).
2. On press, call `notificationService.displayNotification()` with:
   - Title: "Test Reminder"
   - Body: "This is a test notification. Geofence notifications work the same way."
   - Sound: default
   - Vibration: enabled if toggled on
3. Record the notification ID and delivery attempt in a local log (for debugging).

**Gate 7.6:** Pressing "Send Test Notification" delivers a visible, audible notification on both iOS and Android real devices.

### Task 7.7 — Schedule/deliver/cancel API (0.5 day)

**Goal:** Implement scheduled notifications for when a reminder's geofence triggers (future phase integration).

Steps:
1. Implement `scheduleNotification()` to support future-timestamp delivery.
2. When a reminder transitions to `ARRIVAL_PENDING`, the service (Phase 8) will schedule a notification with a trigger timestamp.
3. Implement cancel logic: when a reminder is deleted, paused, or cancelled, call `cancelNotification()` with the stored notification ID.
4. Handle notification tap: when the user taps a notification, deep-link to the reminder's Detail screen (via React Navigation `navigation.navigate`).

**Gate 7.7:** A notification scheduled for N seconds in the future delivers at approximately that time. Tapping it deep-links to the correct reminder detail screen.

### Task 7.8 — Persist notification preferences (0.5 day)

**Goal:** Save sound/vibration preferences to SQLite so they survive app restarts.

Steps:
1. Add notification preference columns to the existing `reminders` table (already present in the schema — `notificationSoundEnabled`, `notificationVibrationEnabled`).
2. On save, store the reminder's notification preferences alongside the reminder data.
3. When scheduling a notification for a reminder, read these preferences from the repository and configure the notification payload accordingly.

**Gate 7.8:** A reminder saved with sound off produces a silent notification; vibration off skips vibration. Preferences persist across app restarts.

---

## 5. Testing strategy

### Unit tests (mocked)

`src/services/notificationService.test.ts`:
- `requestPermission()` returns correct status codes.
- `scheduleNotification()` returns a valid notification ID.
- `cancelNotification()` and `cancelAllNotifications()` call the correct notifee methods.
- Error handling: network offline, native module unavailable → graceful fallback, no crash.

### Integration tests (real device)

| Test | iOS real device | Android real device |
|---|---|---|
| First launch: permission dialog appears | ✅ | ✅ |
| Authorize: notification delivers with sound | ✅ | ✅ |
| Deny: Settings shows "Denied" with "Open Settings" link | ✅ | ✅ |
| Test notification button delivers immediately | ✅ | ✅ |
| Scheduled notification fires at specified time | ✅ | ✅ |
| Tapping notification deep-links to reminder detail | ✅ | ✅ |
| Cancel notification: it disappears from notification center | ✅ | ✅ |
| Sound off → silent notification | ✅ | ✅ |
| Vibration off → no vibration | ✅ | ✅ |

### Simulator notes

- iOS Simulator: notifications display but may not play sound. Acceptable for early testing.
- Android Emulator: notifications display and can produce sound if the emulator audio is configured. Acceptable for early testing.
- **Gate 7 requires real devices.** Simulator success alone does not pass Gate 7.

---

## 6. Integration points with existing code

### With reminderStore (`src/stores/reminderStore.ts`)

```typescript
// After a reminder is saved, if it's ARMED or ARRIVAL_PENDING,
// schedule a notification for it.
import { notificationService } from '../services/notificationService';

async function save(reminder: Reminder): Promise<Reminder> {
  // ... existing save logic ...
  
  // If the reminder is active, schedule its notification.
  if (reminder.status === ReminderStatus.ARMED || 
      reminder.status === ReminderStatus.ARRIVAL_PENDING) {
    await scheduleReminderNotification(reminder);
  }
  
  return result;
}
```

### With reminder detail screen (`src/screens/ReminderDetailScreen.tsx`)

When a notification is tapped, the app should navigate to this screen:
```typescript
// In AppNavigator.tsx or a navigation listener:
navigation.addListener('state', () => {
  const notificationData = await getInitialNotification();  // notifee API
  if (notificationData?.data?.reminderId) {
    navigation.navigate('Detail', { 
      reminder: await store.findById(notificationData.data.reminderId) 
    });
  }
});
```

### With Settings (`src/screens/SettingsScreen.tsx`)

The notification toggles (already present as UI) now call the service:
```typescript
// Existing toggle onChange handlers now wire to:
await notificationService.createChannel({
  id: 'gps_reminder_default',
  name: 'GPS Reminders',
  sound: settings.soundEnabled ? 'default' : null,
  vibrationPattern: settings.vibrationEnabled ? [200, 100, 200] : [],
});
```

---

## 7. Risk register

| Risk | Likelihood | Mitigation |
|---|---|---|
| notifee fails to link on RN 0.88 New Architecture | Low (but non-zero) | Fallback: write thin native modules using UNUserNotificationCenter (iOS) and NotificationManager (Android). Both are available in RN 0.60+ without extra dependencies. |
| iOS background delivery delays or failures | High (OS-dependent) | Document as known limitation. Test on real devices. Accept late delivery as per product spec. |
| Android 13+ POST_NOTIFICATIONS permission runtime request | Medium (platform change) | Handle gracefully — denied state shows UI, never crashes. Add permission to AndroidManifest.xml as compile-time declaration. |
| Android OEM background restrictions (MIUI, EMUI, etc.) | High on some devices | Document per-device-observed behavior. No fix possible in MVP — mark as known limitation for Gate 8. |
| Custom sound file not found on one platform | Low | Use system default sound as fallback. Test both platforms during Task 7.4. |
| Notification tap deep-link fails if app was force-stopped | Medium (iOS) | Use `UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:)` and `getInitialNotification()` to handle cold-start notification taps. |

---

## 8. Gate 7 criteria

**A controlled manual test can schedule/deliver/cancel a local notification on real iOS and Android devices. This is not yet proof of geofence delivery.**

Specifically:
- [ ] `@notifee/react-native` installed, both platforms build cleanly.
- [ ] Notification permission dialog appears on first request (real device).
- [ ] Authorized: an immediate notification delivers with sound and vibration.
- [ ] Denied: Settings shows "Denied" with a link to open OS settings (no crash).
- [ ] "Send Test Notification" button delivers a visible, audible notification on both platforms.
- [ ] A scheduled notification (future timestamp) fires at approximately the specified time on both platforms.
- [ ] Tapping a notification deep-links to the correct reminder's Detail screen.
- [ ] Cancel notification removes it from the notification center on both platforms.
- [ ] Sound/vibration preferences are respected and persist across app restarts.
- [ ] Unit tests pass (mocked service).

**Status:** Not started

---

## 9. Files summary

| Action | Path | Purpose |
|---|---|---|
| **Add** | `@notifee/react-native` (npm) | Local notification library |
| **Create** | `src/services/notificationService.ts` | TypeScript interface + notifee implementation |
| **Create** | `src/services/notificationService.test.ts` | Unit tests (mocked) |
| **Create** | `src/components/NotificationPermissionBanner.tsx` | Permission-education UI component |
| **Modify** | `package.json` | Add dependency |
| **Modify** | `android/app/src/main/AndroidManifest.xml` | Add POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM, USE_EXACT_ALARM permissions |
| **Modify** | `ios/GPSReminder/Info.plist` | Add NSUserNotificationsUsageDescription |
| **Modify** | `src/screens/SettingsScreen.tsx` | Wire notification toggles to service; add permission status UI; add test notification button |
| **Modify** | `src/screens/OnboardingScreen.tsx` | Add notification-permission step (if onboarding exists) |
| **Modify** | `src/stores/settingsStore.ts` | Persist notification preferences; read from service on init |
| **Modify** | `docs/DECISIONS.md` | Record library choice and compatibility results |

---

## 10. Post-Gate 7: handoff to Phase 8

Phase 7 delivers the *notification delivery mechanism*. Phase 8 (Native geofencing) will connect it to the actual geofence lifecycle:

1. When a reminder transitions to `ARRIVAL_PENDING` (Phase 8), the geofence module calls `notificationService.scheduleNotification()` with a trigger timestamp.
2. The stationary qualification timer (Phase 8) determines when to fire the scheduled notification.
3. On `TRIGGERED`, the geofence module calls `notificationService.displayNotification()` (immediate) or lets the scheduled notification fire naturally.
4. On cancel/delete/pause, the geofence module calls `notificationService.cancelNotification()`.

The notification service interface is designed to be agnostic of *what* triggers the notification — only *that* it should be delivered. This decoupling means Phase 7 can be tested independently, and Phase 8 only needs to call the right service methods at the right state transitions.
