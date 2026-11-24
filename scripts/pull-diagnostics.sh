#!/usr/bin/env bash
# Pull the app's SQLite database plus permission state from a connected Android device.
#
# Usage: scripts/pull-diagnostics.sh [package] [output-dir]
#
# Requires a debuggable build (debug APK, or a release build signed with the debug key):
# `adb exec-out run-as <pkg>` only works for debuggable apps.

set -euo pipefail

PKG="${1:-com.gpsreminder}"
OUT_DIR="${2:-/tmp/gps-reminder-diagnostics}"
DB_NAME="gps-reminder.db"

if ! adb get-state >/dev/null 2>&1; then
  echo "ERROR: no device attached. Connect the phone with USB debugging enabled." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "=== Device ==="
adb shell getprop ro.product.model | tr -d '\r'
adb shell getprop ro.build.version.release | tr -d '\r'
echo "package: $PKG"
echo "output:  $OUT_DIR"

echo
echo "=== Installed package ==="
adb shell dumpsys package "$PKG" 2>/dev/null \
  | grep -E "versionName|versionCode|firstInstallTime|lastUpdateTime" \
  | sed 's/^ *//' || echo "(package not found)"

echo
echo "=== Runtime permissions ==="
adb shell dumpsys package "$PKG" 2>/dev/null \
  | grep -E "ACCESS_(FINE|COARSE|BACKGROUND)_LOCATION|POST_NOTIFICATIONS" \
  | sed 's/^ *//' || true

echo
echo "=== Database files ==="
adb shell run-as "$PKG" ls -l databases 2>/dev/null || {
  echo "ERROR: run-as failed — the installed APK is not debuggable." >&2
  exit 1
}

# Pull the database together with its WAL sidecars; without them the newest rows are missing.
for suffix in "" "-wal" "-shm"; do
  file="$DB_NAME$suffix"
  if adb shell run-as "$PKG" test -f "databases/$file" 2>/dev/null; then
    adb exec-out run-as "$PKG" cat "databases/$file" > "$OUT_DIR/$file"
  fi
done

TARGET="$OUT_DIR/$DB_NAME"

echo
echo "=== Log volume ==="
sqlite3 "$TARGET" "SELECT level, COUNT(*) FROM app_logs GROUP BY level ORDER BY 2 DESC;"

echo
echo "=== Top tags ==="
sqlite3 "$TARGET" "SELECT tag, COUNT(*) FROM app_logs GROUP BY tag ORDER BY 2 DESC LIMIT 15;"

echo
echo "=== App state / permission / registration trail ==="
sqlite3 -header -column "$TARGET" \
  "SELECT at, level, tag, substr(message, 1, 110) AS message
     FROM app_logs
    WHERE tag IN ('app', 'permission', 'geofence', 'reconcile')
    ORDER BY id ASC;"

echo
echo "=== Arrival and stationary events ==="
sqlite3 -header -column "$TARGET" \
  "SELECT at, level, tag, substr(message, 1, 110) AS message, substr(COALESCE(data, ''), 1, 90) AS data
     FROM app_logs
    WHERE tag IN ('arrival', 'stationary')
    ORDER BY id ASC;"

echo
echo "=== Status transitions (store) ==="
sqlite3 -header -column "$TARGET" \
  "SELECT at, level, substr(message, 1, 80) AS message, substr(COALESCE(data, ''), 1, 120) AS data
     FROM app_logs
    WHERE tag = 'store'
    ORDER BY id ASC;"

echo
echo "=== Reminders ==="
sqlite3 -header -column "$TARGET" \
  "SELECT id, title, status, radiusMeters, updatedAt, triggeredAt,
          lastStationaryReadingAt
     FROM reminders;"

echo
echo "Raw database copied to: $TARGET"
