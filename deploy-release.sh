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

echo "=== Step 3: Uninstall old app ==="
adb uninstall com.gpsreminder || true

echo "=== Step 4: Install new APK ==="
adb install -r "$ROOT/android/$APK"

echo "=== Done! Verify version in Settings > About ==="
