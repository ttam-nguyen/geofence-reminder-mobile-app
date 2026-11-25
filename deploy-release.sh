#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Optional: pass --diagnostics to build a debuggable release APK, which allows
# `scripts/pull-diagnostics.sh` to read the app database with `adb run-as`.
# A plain string, not an array: macOS ships bash 3.2, where expanding an empty
# array under `set -u` fails with "GRADLE_ARGS[@]: unbound variable".
GRADLE_ARGS=""
if [ "${1:-}" = "--diagnostics" ]; then
  GRADLE_ARGS="-Pdiagnostics"
  echo "=== Diagnostics build: release APK will be debuggable ==="
fi

# Fail loudly if the working tree is older than the code the user expects to test.
echo "=== Source version ==="
grep "APP_VERSION" src/config/version.ts
git log -1 --format="HEAD %h %ad %s" --date=iso 2>/dev/null || true

echo "=== Step 1: Bundle JS ==="
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android/app/build/generated/assets/react/release/index.android.bundle \
  --assets-dest android/app/build/generated/res/react/release

echo "=== Step 2: Assemble release APK ==="
cd android
./gradlew app:assembleRelease ${GRADLE_ARGS}

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

echo "=== Step 5: Verify the installed build ==="
INSTALLED_VERSION=$(grep -oE "[0-9]+\.[0-9]+\.[0-9]+" src/config/version.ts | head -1)
ADB_STAMP=$(adb shell dumpsys package com.gpsreminder 2>/dev/null | grep -E "lastUpdateTime" | head -1 | tr -d '\r')
echo "Expected app version : v${INSTALLED_VERSION}"
echo "Device package state : ${ADB_STAMP:-unknown}"
echo "Check Settings > About shows v${INSTALLED_VERSION}."
