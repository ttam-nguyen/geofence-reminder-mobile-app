# Maestro MCP Setup Guide

## Current System Status

### Already Installed ✅

| Prerequisite | Status | Details |
|---|---|---|
| Java 17+ | ✅ Installed | OpenJDK 17.0.19 via Homebrew (`JAVA_HOME` set) |
| Xcode + CLI Tools | ✅ Installed | `/Applications/Xcode.app/Contents/Developer` |
| iOS Simulators | ✅ Available | iPhone 17 Pro, iPhone 16e, iPad models (iOS 26.3) |
| Android SDK | ✅ Installed | At `/Users/tam/Library/Android/sdk` (platforms 34/35/36.1, platform-tools, build-tools) |
| adb | ✅ Installed | Homebrew `android-platform-tools` (v37.0.2) |
| Android Studio | ✅ Installed | `/Applications/Android Studio.app` |

### Missing ❌

| Item | Status |
|---|---|
| **Maestro CLI** | Not installed (needs to be installed) |
| **Android AVDs** | None created yet (no virtual devices configured) |

---

## Step-by-Step Setup

### 1. Install Maestro CLI

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash
```

Verify:

```bash
maestro --version
```

### 2. Add Maestro as an MCP Server to Pi

This registers the Maestro MCP server so I (the agent) can call its tools:

```bash
pi mcp add maestro -- maestro mcp
```

Verify the connection:

```bash
pi mcp list
```

You should see `mcp__maestro__*` tools listed (e.g., `list_devices`, `inspect_screen`, `take_screenshot`, `run`).

After adding, restart the Pi session or run `/reload` inside a session.

### 3. Create an Android Virtual Device (AVD)

Android Studio is installed but no emulators are configured. Create one:

1. Open **Android Studio**
2. Go to **More Actions** → **Virtual Device Manager**
3. Click **Create Virtual Device (+)**
4. Select a device (Pixel 8 recommended) → Next
5. Download a system image — **API 31 or higher** (Maestro supports API 29, 30, 31, 33, 34; API 35/36 coming Q2 2026)
6. Finish the wizard
7. Click the **Play** button to start the emulator

The emulator must be running for Maestro to connect.

### 4. Build and Install Your App

#### Android — Build & Install on Emulator

```bash
cd /Users/tam/Git/geofence-reminder-mobile-app/android
./gradlew assembleDebug
```

This produces the APK at:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a running emulator:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

#### iOS — Build & Install on Simulator (Future)

Your project currently has **no `ios/` folder**. When you add iOS platform files:

```bash
npx react-native run-ios --simulator="iPhone 16e"
```

The `.app` lands at:

```
ios/build/Build/Products/Debug-iphonesimulator/GPSReminder.app
```

Install on a running simulator:

```bash
xcrun simctl install <UDID> ios/build/Build/Products/Debug-iphonesimulator/GPSReminder.app
```

Get the UDID:

```bash
xcrun simctl list devices available | grep "iPhone 16e"
```

### 5. Start a Simulator or Emulator Before Running Tests

**iOS (iPhone 16e):**

```bash
xcrun simctl boot "BC75A4F0-8F6D-4824-9CDC-A502C3EE1F33"
```

**Android (Pixel 8 emulator):** Start from Android Studio → Virtual Device Manager → Play button.

### 6. Run Maestro Tests

Once a device is running and your app is installed, tests can be run via CLI:

```bash
maestro test flows/your-test.yaml
```

Or via MCP tools during a Pi session — I call the tools directly:

| Tool | Purpose |
|---|---|
| `mcp__maestro__list_devices` | List available emulators/simulators |
| `mcp__maestro__inspect_screen` | Get the current UI hierarchy as JSON |
| `mcp__maestro__take_screenshot` | Capture a screenshot of the device |
| `mcp__maestro__run` | Execute Maestro test flows (YAML) |

---

## Available iOS Simulators

| Device | UDID | Status |
|---|---|---|
| iPhone 17 Pro | `5AD0362E-A55B-4D73-8FAC-8612E57EEE51` | Shutdown |
| iPhone 17 Pro Max | `5C08B4FC-A928-4608-9144-69007A08014B` | Shutdown |
| iPhone 16e | `BC75A4F0-8F6D-4824-9CDC-A502C3EE1F33` | Shutdown |
| iPad Pro 13" (M5) | `74CD1A45-ACDB-4736-AF27-FD4CF6CC0CF` | Shutdown |
| iPad Pro 11" (M5) | `C88BE123-D5F3-4E47-9228-9FAE90C83DC` | Shutdown |
| iPad mini (A17 Pro) | `69FF6049-C94A-4C4E-89B8-FCA017CDA721` | Shutdown |
| iPad (A16) | `51C4BFEA-0EDB-409B-A064-CED5AFC9499` | Shutdown |
| iPad Air 13" (M3) | `25CD7475-B564-CBD-A200-063F42083A76` | Shutdown |
| iPad Air 11" (M3) | `E0FDBA1C-C7F6-4A5C-A441-206A866B9DA` | Shutdown |

All on iOS 26.3 runtime — ready to boot.

---

## Troubleshooting

### Android Studio installed but `emulator` not found on PATH

Android Studio's CLI tools aren't automatically on PATH. Add this to `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROIDPLATFORM-tools
export PATH=$PATH:$ANDROIDHOME/cmdline-tools/latest/bin
```

Then: `source ~/.zshrc`

Verify:

```bash
emulator -list-avds
sdkmanager --list
```

### "No device connected" errors

Make sure the emulator/simulator is **running** before running Maestro tests. A shutdown simulator won't connect.

### Java errors from Maestro

Ensure `JAVA_HOME` points to your Java 17 installation:

```bash
echo $JAVA_HOME
# Should output: /opt/homebrew/Cellar/openjdk@17/17.0.19/libexec/openjdk.jdk/Contents/Home
```

### Xcode components missing (no iOS simulators)

If Xcode was installed without opening it, run once:

```bash
sudo xcodebuild -license accept
xcodebuild -runFirstLaunch
```

Then restart the Pi session.
