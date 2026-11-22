#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

echo "=== Step 1: Bundle JS ==="
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/build/generated/assets/react/release/index.android.bundle \
  --assets-dest android/app/build/generated/res/react/release

echo "=== Step 2: Assemble release APK ==="
cd android
./gradlew app:assembleRelease

# Find the actual APK (may vary by ABI config)
APK=$(find app/build/outputs/apk/release -name "*.apk" | head -1)
if [ -z "$APK" ]; then
  echo "ERROR: No APK found in app/build/outputs/apk/release/"
  exit 1
fi
cd ..

echo "=== Step 3: Install as update (keeps app data) ==="
# `adb install -r` replaces the APK in place and preserves the app's data
# directory (SQLite reminders, AsyncStorage flags, permissions).
if adb install -r "$ROOT/android/$APK"; then
  echo "Updated in place — app data preserved."
else
  echo "Update install failed (signature mismatch, version downgrade, or corrupt package)."
  echo "=== Step 4: Fallback — uninstall, then fresh install ==="
  echo "WARNING: uninstall drops the app's data (reminders and saved settings)."
  adb uninstall com.gpsreminder || true
  adb install "$ROOT/android/$APK"
fi

echo "=== Done! Verify version in Settings > About ==="
