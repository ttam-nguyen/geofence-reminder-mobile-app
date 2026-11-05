# Plan 6: Notifications & App Lifecycle Recovery

## Feature Name
Local Notifications, Sound/Vibration, and App/Device Restart Recovery

## Goal
Implement local notification delivery (title, sound, vibration), handle OS notification permission states, and recover geofence registrations after app restart or device reboot.

## Tech Stack
| Layer | Choice |
|---|---|
| Notifications (iOS) | Custom native module — `UNUserNotificationCenter` (`usernotifications`) |
| Notifications (Android) | Custom native module — `NotificationManager` + `PendingIntent` |
| Sound/Vibration | Native: iOS `AVAudioPlayer` (alert sound), Android `RingtoneManager` / `Vibrator` |
| Lifecycle | React Native `AppState` listener + native lifecycle events |

## Spec References
- §6 Notification requirements: local notification, sound, vibration, offline delivery
- §6 SMS out of scope for MVP
- §5 Background: app restart, device restart recovery
- §10 Quality: scenarios 16 (ad failure doesn't block), 17 (notification permission denial explained)

## Global Constraints
- Notifications deliver offline (no internet required)
- Notification does not depend on ad network or cloud services
- Sound/vibration respect OS settings (silent mode, Do Not Disturb — document limitations)
- Notification permission denial: clear user-facing message
- Device restart: eligible reminders re-registered (where OS supports)
- Swipe-away / force-stop: document OS limitations, cannot guarantee behavior

## Review Focus
- Notification displays with reminder title and context when triggered
- Sound plays when OS allows and user enabled it
- Vibration occurs when supported and enabled
- Notification permission denial shown clearly to user
- App restart restores notification queue and eligible geofences
- Device reboot: eligible reminders recover (Android: works, iOS: limited)

## Files to Create

```
src/native/
  NotificationModule.ts        — TypeScript interface for notification module

ios/
  GPSReminder/NotificationModule.swift   — iOS native: UNUserNotificationCenter, alert sound, vibration
  GPSReminder/NotificationService.swift  — Background notification handling (iOS)

android/app/src/main/java/com/gpsreminder/
  NotificationModule.k         — Android native: NotificationManager, sound, vibration

src/services/
  NotificationService.ts       — Schedule local notification, play sound/vibration

src/services/
  RecoveryService.ts           — App/device restart recovery: re-register geofences, restore notification queue

src/stores/
  notificationStore.ts         — Zustand store: notification state, delivery records

src/ui/
  PermissionStatusView.tsx     — UI: display notification + location permission status, recovery guidance

src/__tests__/
  services/
    NotificationService.test.ts — Schedule notification, play sound/vibration
    RecoveryService.test.ts    — Restart recovery: re-register eligible reminders

```

## Interfaces

### Native Module Interface (TypeScript side)

```typescript
// src/native/NotificationModule.ts
export interface ScheduleNotificationParams {
  notificationId: string; // maps to Reminder.id or NotificationDeliveryRecord.id
  title: string;
  body: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  data?: Record<string, string>; // custom data (reminder ID, deep link)
}

export interface NotificationModuleInterface {
  scheduleLocalNotification(params: ScheduleNotificationParams): Promise<{ success: boolean; notificationId?: string; error?: string }>;
  cancelNotification(notificationId: string): Promise<{ success: boolean }>;
  checkNotificationPermission(): Promise<'granted' | 'denied' | 'never_asked'>;
  requestNotificationPermission(): Promise<'granted' | 'denied' | 'never_asked'>;
}

export const NotificationModule: NotificationModuleInterface;
```

### Notification Service (`src/services/NotificationService.ts`)

```typescript
export class NotificationService {
  constructor(
    private notificationModule: NotificationModule,
    private deliveryRepository: NotificationLogRepository,
  ) {}

  // Schedule a local notification for a triggered reminder
  scheduleReminderNotification(reminder: Reminder): Promise<string>; // returns notificationId

  // Play alert sound (if enabled and OS allows)
  playAlertSound(): Promise<void>;

  // Vibrate device (if enabled and supported)
  vibrateDevice(): Promise<void>;

  // Check notification permission status
  checkPermission(): Promise<'granted' | 'denied' | 'never_asked'>;

  // Request notification permission (first time)
  requestPermission(): Promise<'granted' | 'denied' | 'never_asked'>;
}
```

### Recovery Service (`src/services/RecoveryService.ts`)

```typescript
export class RecoveryService {
  constructor(
    private reminderRepository: ReminderRepository,
    private registrationManager: RegistrationManager,
  ) {}

  // Called on app startup: re-register all eligible geofences from persisted state
  recoverOnAppStart(): Promise<void>;

  // Called on device boot (Android broadcast receiver / iOS didFinishLaunching):
  // Re-register eligible reminders that were ARMED or WAITING_FOR_EXIT before shutdown
  recoverOnDeviceBoot(): Promise<void>;

  // Restore notification delivery records that were PENDING at time of shutdown
  restorePendingNotifications(): Promise<void>;
}
```

### Notification Store (`src/stores/notificationStore.ts`)

```typescript
interface NotificationState {
  permissionStatus: 'granted' | 'denied' | 'never_asked' | null;
  deliveryRecords: NotificationDeliveryRecord[];
  checkPermission: () => Promise<void>;
  requestPermission: () => Promise<void>;
  scheduleNotification: (reminderId: string, title: string, body: string) => Promise<void>;
  getDeliveryRecords: (reminderId: string) => Promise<NotificationDeliveryRecord[]>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({...}));
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 6.1:** Implement iOS native notification module
  - Create `ios/GPSReminder/NotificationModule.swift` — wraps `UNUserNotificationCenter`
  - Implement `scheduleLocalNotification()`, `cancelNotification()`, `checkPermission()`, `requestPermission()`
  - Implement alert sound: load audio file from app bundle, play via `AVAudioPlayer`
  - Test: compiles, exports methods, schedules notification appears in notification center
  - Expected: iOS native code compiles, notifications appear

- [ ] **Step 6.2:** Implement Android native notification module
  - Create `android/.../NotificationModule.k` — wraps `NotificationManager`
  - Implement `scheduleLocalNotification()`, `cancelNotification()`, permission methods
  - Implement sound: `RingtoneManager.getDefaultUri(RingtoneType.ALARM)` or custom
  - Implement vibration: `Vibrator.vibrate()` with pattern
  - Test: compiles, schedules notification appears in notification panel
  - Expected: Android native code compiles, notifications appear

- [ ] **Step 6.3:** Implement JS-side notification service
  - Create `src/services/NotificationService.ts` — wraps native module, logs to SQLite
  - Test: `src/__tests__/services/NotificationService.test.ts` — schedule notification creates delivery record, permission check returns correct status
  - Expected: Service schedules notifications, logs delivery records

- [ ] **Step 6.4:** Implement recovery service
  - Create `src/services/RecoveryService.ts` — re-registers eligible reminders on app start and device boot
  - Test: `src/__tests__/services/RecoveryService.test.ts` — app start re-registers ARMED/WAITING_FOR_EXIT reminders, skips TRIGGERED/COMPLETED/CANCELLED
  - Expected: Recovery re-registers correct reminders

- [ ] **Step 6.5:** Implement notification store
  - Create `src/stores/notificationStore.ts` — Zustand store for notification state
  - Test: permission status updates, delivery records stored and retrieved
  - Expected: Store manages notification state correctly

- [ ] **Step 6.6:** Implement PermissionStatusView
  - Create `src/ui/PermissionStatusView.tsx` — displays notification + location permission status
  - Shows recovery guidance when permissions denied: "Location access is required for geofences to work. Enable in Settings."
  - Test: renders permission status, shows recovery message when denied
  - Expected: User sees clear permission status and guidance

- [ ] **Step 6.7:** Integrate recovery into app startup
  - Add `RecoveryService.recoverOnAppStart()` call in `src/app.tsx` (entry point)
  - Test: app starts, eligible reminders re-registered, no crash
  - Expected: Recovery runs silently on startup

- [ ] **Step 6.8:** Real-device test — notification delivery
  - Deploy to physical device (iOS + Android)
  - Trigger a reminder (manual state transition for testing)
  - Verify: notification appears in notification center with title + body
  - Verify: sound plays (if OS allows), vibration occurs (if supported)
  - Expected: Notification delivered offline, sound/vibration work when permitted

- [ ] **Step 6.9:** Real-device test — app restart recovery
  - Close app completely, reopen
  - Verify: eligible geofences re-registered (check logs)
  - Expected: App restart restores all eligible geofences

- [ ] **Step 6.10:** Real-device test — notification permission denial
  - Deny notification permission in OS settings
  - Verify: PermissionStatusView shows "Notifications disabled" message with recovery guidance
  - Expected: Clear user-facing message, no crash

- [ ] **Step 6.11:** Create commit
  - Command: `git add . && git commit -m "feat: notifications — local delivery, sound/vibration, permission status, restart recovery"`
  - Expected: Clean commit at revision `v6-notifications`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/services/NotificationService.ts src/services/RecoveryService.ts src/stores/notificationStore.ts

# Unit tests
npx vitest run src/__tests__/services/NotificationService.test.ts src/__tests__/services/RecoveryService.test.ts

# Real-device test (manual, both platforms)
npx react-native run-ios --simulator "iPhone 14"   # or physical device
npx react-native run-android --variant=debug         # or physical device
# Manual: trigger reminder → verify notification appears, sound/vibration work
# Manual: deny notification permission → verify status view shows guidance
# Manual: restart app → verify geofences re-registered
```

## Drift-Check Command

```bash
git diff v6-notifications..HEAD -- src/native/NotificationModule.ts ios/GPSReminder/Notification* android/.../NotificationModule.k src/services/NotificationService.ts src/services/RecoveryService.ts src/stores/notificationStore.ts src/ui/PermissionStatusView.tsx
```
