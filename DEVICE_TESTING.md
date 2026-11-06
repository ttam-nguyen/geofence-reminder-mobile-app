# GPS Reminder — Device Testing Guide

## Build & Side-Load onto Android Phone

### Prerequisites

1. **Android Studio** installed with:
   - Android SDK (API 34+ recommended)
   - Platform Tools (`adb`)
   - NDK (Side by side) 26.x
   - Build-Tools 35.x
   - Android Platform 35

2. **Java 17** on your Mac:
   ```bash
   java -version
   # Should show 17.x.x (OpenJDK 17 from Homebrew)
   ```
   If you have Java 26, use: `export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home`

3. **Android SDK path** — create `android/local.properties`:
   ```bash
   echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
   ```

4. **Your Android phone** connected via USB cable.

5. **Enable Developer Options** on your phone:
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings → Developer Options

6. **Enable USB Debugging** in Developer Options:
   - Turn ON "USB debugging"
   - (Optional but recommended) Turn ON "USB debugging (Security Settings)"

### Build Steps

From the project root:

```bash
# 1. Install dependencies (if not already done)
npm install --legacy-peer-deps

# 2. Verify TypeScript compiles clean (should show zero errors)
npx tsc --noEmit

# 3. Set Java 17 (required — Gradle 8.4 does not support Java 26)
export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home

# 4. Build the Android debug APK
cd android && ./gradlew assembleDebug && cd ..

# The APK will be at: android/app/build/outputs/apk/debug/app-debug.apk
```

### Side-Load onto Phone (with Metro)

Metro must be running to serve the JavaScript bundle:

```bash
# Terminal 1 — Start Metro bundler:
npx react-native start

# Terminal 2 (separate) — Verify phone, install & launch:
adb devices
# Should show: <device-id>    device
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.gpsreminder/.MainActivity
```

### Side-Load onto Phone (bundled JS, no Metro)

Bundle the JS into the APK so Metro is not needed:

```bash
# Bundle JS into APK assets (run once):
npx react-native bundle --platform android --dev false \
  --entry-file index.js \
  --bundle-output android/app/src/main/assets/index.android.bundle \
  --assets-dest android/app/src/main/res/

# Build APK (JS is now embedded):
cd android && export JAVA_HOME=/opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home
./gradlew assembleDebug && cd ..

# Install & launch (no Metro needed):
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.gpsreminder/.MainActivity
```

---

## End-to-End Testing Instructions

### Test 1: Onboarding Flow

1. Open the app for the first time (or clear app data).
2. **Verify:** 3-screen onboarding appears (concept → background location → notifications).
3. Click **Next** through all 3 screens.
4. Verify "Get Started" completes onboarding and shows the Home screen.
5. **Skip test:** Click "Skip" on each screen — should complete immediately.

### Test 2: Create Reminder via GPS

1. From Home screen, tap **"+ Add Reminder"**.
2. In the title field, enter: **"Pick up groceries"**.
3. Tap **"Current GPS"** tab (default).
4. Wait for location to resolve (~2 seconds).
5. **Verify:** A coordinate summary appears below the GPS button.
6. Verify radius is set to 100m (default preset).
7. Tap **"Save Reminder"**.
8. **Verify:** Alert shows "Saved" — tap OK.
9. **Verify:** You return to Home screen with 1 active reminder shown.

### Test 3: Create Reminder via Map Pin

1. From Home screen, tap **"+ Add Reminder"**.
2. Enter title: **"Meet at cafe"**.
3. Tap **"Map Pin"** tab.
4. Tap **"Open Map"** button.
5. **Verify:** A coordinate summary appears (mock data: 37.7849, -122.4094).
6. Verify radius presets (100m, 200m, 500m, 1km) are selectable.
7. Tap **500m** preset — verify it highlights.
8. Verify notification toggles (Sound, Vibration) toggle ON/OFF.
9. Tap **"Save Reminder"**.
10. **Verify:** Second reminder appears in Home list.

### Test 4: Reminder List View

1. From Home screen, scroll to active reminders (or tap "See all").
2. **Verify:** Both created reminders appear with title, location name, radius, and status badge.
3. **Test search:** Type "groceries" in the search bar.
4. **Verify:** Only "Pick up groceries" remains visible.
5. Clear search — both reminders reappear.
6. Tap the **"Active"** filter tab — only active reminders shown.
7. **Verify:** Status badges display correctly (ARMED = blue, etc.).

### Test 5: Reminder Details

1. Tap on any reminder in the list to open details.
2. **Verify:** Full title, description (if any), coordinates, radius displayed.
3. **Verify:** A map preview shows the target location with radius circle.
4. **Verify:** Status badge matches the reminder's current state.
5. **Verify:** "Edit" and "Delete" buttons are visible in header.
6. Tap **"Edit"** — should navigate to Create Reminder screen with pre-filled data.
7. Make a change and save — **verify** the list updates.

### Test 6: Delete Reminder

1. From Reminder Details screen, tap **"Delete"**.
2. **Verify:** Confirmation dialog appears: "Are you sure you want to delete 'X'?"
3. Tap **"Cancel"** — dialog dismisses, reminder still exists.
4. Tap **"Delete"** again — **verify** the reminder is removed from the list.

### Test 7: Offline Behavior

1. Turn OFF Wi-Fi and Mobile Data on your phone.
2. Open the app.
3. **Verify:** An offline banner appears at the top: "You are offline. Core features work, search unavailable."
4. Create a reminder via GPS — **verify** it works (GPS works offline).
5. Try to create via Search — **verify** a message says search is unavailable.
6. View existing reminders — **verify** they load normally.

### Test 8: Map Screen

1. From bottom tabs, navigate to the **Map** tab.
2. **Verify:** A map is displayed (placeholder — shows pins if any reminders exist).
3. **Verify:** Reminder pins appear on the map (if reminders have coordinates).
4. **Verify:** A count badge shows "X reminder(s) on map".

### Test 9: Settings Screen

1. From bottom tabs, navigate to **Settings**.
2. **Verify:** All sections render: Notifications, Theme, Privacy & Permissions, About.
3. **Verify:** Notification preferences section exists (placeholder for Plan 6 integration).
4. **Verify:** Theme shows "Frosted Future (default)" with description.
5. **Verify:** Privacy section explains location, notifications, and data storage policies.
6. **Verify:** About section shows app name and version "0.1.0".

### Test 10: Navigation Flow

1. Start at Home → Create Reminder → Save → Back to Home.
2. From Home → Tap a reminder → Details → Edit → Save → Back to Details → Back to List.
3. From any tab, switch between Home / Map / Settings using bottom tabs.
4. **Verify:** Navigation state is preserved (e.g., search query persists when returning).

### Test 11: Permission Status View

1. From Reminder Details screen, scroll to the permission status section.
2. **Verify:** Notification permission status is displayed.
3. **Verify:** Location permission status is displayed.
4. If permissions are denied, **verify** a recovery message appears: "Enable it in Settings for geofences to work."
5. **Verify:** An "Open Settings" button is visible when permissions are denied.

---

## Troubleshooting

### App won't install
```bash
# Check if phone is recognized
adb devices

# If not showing, check USB connection and enable MTP/PTP mode on phone
# Try: adb kill-server && adb start-server
```

### App crashes on launch
```bash
# Check logs
adb logcat | grep -i "gpsreminder\|ReactNativeJS"

# Common issues:
# - Native modules not linked (need pod install for iOS)
# - Missing permissions in AndroidManifest.xml or Info.plist
# - SQLite database not initialized
```

### Geofencing doesn't trigger
- Ensure "Allow all the time" location permission is granted (not just "While using").
- On Android, enable "Background location" and "Precise location" in app permissions.
- On iOS, ensure "Always" authorization is selected.
- Simulators do NOT support geofencing — use a real device.

### Build fails
```bash
# Clean and rebuild
cd android && ./gradlew clean && cd ..
npx react-native run-android --variant=debug
```
