# Plan 3: Native Geofencing Proof of Concept

## Feature Name
Native Geofencing — iOS Core Location + Android Geofencing API

## Goal
Build a working geofencing proof of concept on both iOS and Android: register a single geofence, receive entry/exit events in background, handle permissions, and deliver a test notification. This is the critical technical risk — validate before UI investment.

## Architecture
- Custom React Native native modules (bridging pattern)
- iOS: Core Location `CLRegion` / `CLCircularRegion` monitoring
- Android: Google Play Services Geofencing API (`GeofencingClient`)
- Event bridge: JS → native event listeners for region enter/exit
- Permission handler: request and check location permissions on both platforms

## Tech Stack
| Layer | Choice |
|---|---|
| iOS Native | Swift — Core Location framework (`CLLocationManager`, `CLCircularRegion`) |
| Android Native | Kotlin — Google Play Services Location (`GeofencingClient`, `Geofence`) |
| Bridge | React Native Native Modules (new architecture: TurboModules / Fabric) with legacy bridge fallback |
| JS Side | TypeScript definitions for native module methods + event listeners |

## Spec References
- §5 Background location: Core Location (iOS), Google Play Services Geofencing (Android)
- §5 Platform mechanisms: foreground, background, app closure, swipe-away, device restart
- §5 Permission flow: contextual request, progressive disclosure, monitoring warning
- §5 Geofence limits: iOS 20 regions, Android 500 geofences
- §10 Quality: real-device validation (simulator insufficient)

## Global Constraints
- Must work on real devices (iOS physical + Android physical/emulator)
- Must receive events when app is in background
- Must handle permission denial gracefully (show monitoring warning)
- Must respect OS limits: iOS 20 regions, Android 500 geofences
- Must define prioritization policy when limit exceeded
- No continuous GPS polling — region monitoring only
- Entry-only triggers (exit events logged but not acted upon at this stage)

## Review Focus
- Geofence registers successfully on iOS and Android
- Entry event received when crossing into geofence radius
- Background events delivered (app backgrounded)
- Permission flow: granted/denied/never-asked handled correctly
- Events persist after app restart (where OS supports)
- Real-device tests pass on both platforms

## Files to Create

```
src/native/
  GeofencingModule.ts        — TypeScript interface for native geofencing module

ios/
  GPSReminder/GeofencingModule.swift       — iOS native module: register, remove, check permissions
  GPSReminder/GeofencingEventEmitter.swift  — Event emitter for region enter/exit events
  GPSReminder/GeofenceManager.swift         — Core Location manager wrapper, region monitoring

android/app/src/main/java/com/gpsreminder/
  GeofencingModule.k          — Android native module: register, remove, check permissions
  GeofencingEventEmitter.k    — Event emitter for geofence events
  GeofenceManager.k           — Google Play Services GeofencingClient wrapper

android/app/src/main/AndroidManifest.xml  — Update: ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION, FOREGROUND_SERVICE_LOCATION

src/hooks/
  useGeofencing.ts            — Hook: register/unregister geofence, listen to events

src/__tests__/
  native/
    GeofencingModule.test.ts  — TypeScript interface tests (mock native module)
  hooks/
    useGeofencing.test.ts     — Hook tests (mock native module)

```

## Interfaces

### Native Module Interface (TypeScript side)

```typescript
// src/native/GeofencingModule.ts
import { NativeEventEmitter, NativeModules } from 'react-native';

const { GeofencingModule } = NativeModules;

export interface RegisterGeofenceParams {
  requestId: string; // maps to Reminder.id
  latitude: number;
  longitude: number;
  radiusMeters: number;
  notifyOnEntry: boolean;
  notifyOnExit?: boolean; // iOS: configurable, Android: always fires
}

export interface GeofenceEvent {
  requestId: string;
  eventType: 'ENTER' | 'EXIT';
  timestamp: number; // epoch ms
  latitude: number;
  longitude: number;
  horizontalAccuracy: number; // meters
}

export interface PermissionStatus {
  locationPermission: 'granted' | 'denied' | 'never_asked' | 'restricted';
  notificationPermission: 'granted' | 'denied' | 'never_asked';
  backgroundLocationAllowed: boolean; // iOS: true if "Always" granted
}

// Exposed methods
export function registerGeofence(params: RegisterGeofenceParams): Promise<{ success: boolean; error?: string }>;
export function unregisterGeofence(requestId: string): Promise<{ success: boolean; error?: string }>;
export function unregisterAllGeofences(): Promise<{ success: boolean }>;
export function checkPermissions(): Promise<PermissionStatus>;
export function requestLocationPermission(): Promise<'granted' | 'denied' | 'never_asked'>;
export function requestBackgroundPermission(): Promise<boolean>; // iOS: requests "Always" authorization

// Events
export const geofenceEvents = new NativeEventEmitter(GeofencingModule);
export function onGeofenceEvent(listener: (event: GeofenceEvent) => void): () => void; // unsubscribe
```

### Hook Interface (`src/hooks/useGeofencing.ts`)

```typescript
interface UseGeofencingReturn {
  register: (params: RegisterGeofenceParams) => Promise<void>;
  unregister: (requestId: string) => Promise<void>;
  checkPermissions: () => Promise<PermissionStatus>;
  permissionStatus: PermissionStatus | null;
  events: GeofenceEvent[];
  onEvent: (listener: (event: GeofenceEvent) => void) => void;
  isSupported: boolean; // false if Google Play Services unavailable (Android)
}

export function useGeofencing(): UseGeofencingReturn;
```

### iOS Native Code (Swift)

```swift
// GeofenceManager.swift
import CoreLocation

class GeofenceManager: NSObject, CLLocationManagerDelegate {
  private let locationManager = CLLocationManager()
  private var registeredRegions: [String: CLCircularRegion] = [:]
  
  func register(regionId: String, latitude: Double, longitude: Double, radius: Double, notifyOnEntry: Bool) -> Result<Void, Error>
  func unregister(regionId: String) -> Result<Void, Error>
  func checkPermissions() -> PermissionStatus
}

// GeofencingEventEmitter.swift
class GeofocneEventEmitter {
  func sendEvent(name: String, body: [String: Any])
}
```

### Android Native Code (Kotlin)

```kotlin
// GeofenceManager.k
import com.google.android.gms.location.GeofencingClient
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest

class GeofenceManager(private val context: Context) {
  private val geofencingClient: GeofencingClient by lazy { LocationServices.getGeofencingClient(context) }
  
  fun registerGeofence(requestId: String, latitude: Double, longitude: Double, radiusMeters: Float, notifyOnEntry: Boolean): Result<Unit, String>
  fun unregisterGeofence(requestId: String): Result<Unit, String>
  fun checkLocationPermissions(): PermissionStatus
}

// GeofencingEventEmitter.k
class GeofencingEventEmitter(private val reactContext: ReactApplicationContext) {
  fun sendGeofenceEvent(requestId: String, eventType: String, latitude: Double, longitude: Double, accuracy: Float)
}
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 3.1:** Define TypeScript interfaces for native module
  - Create `src/native/GeofencingModule.ts` with full type definitions
  - Test: TypeScript compilation passes, all methods and events typed correctly
  - Expected: Zero TypeScript errors

- [ ] **Step 3.2:** Implement iOS native module (Swift)
  - Create `ios/GPSReminder/GeofenceManager.swift` — wraps `CLLocationManager`
  - Implement `registerRegion()`, `unregisterRegion()`, `checkPermissions()`
  - Handle iOS permission states: whenInUse, always, denied, restricted
  - Create `ios/GPSReminder/GeofencingEventEmitter.swift` — emits region enter/exit events to JS
  - Test: Module compiles, exports methods correctly, event emitter fires on region events
  - Expected: iOS native code compiles without errors

- [ ] **Step 3.3:** Implement Android native module (Kotlin)
  - Create `android/app/src/main/java/com/gpsreminder/GeofenceManager.k`
  - Implement `registerGeofence()`, `unregisterGeofence()`, `checkLocationPermissions()`
  - Handle Android permission states: granted, denied, never_asked
  - Check Google Play Services availability
  - Create `android/app/src/main/java/com/gpsreminder/GeofencingEventEmitter.k`
  - Test: Module compiles, exports methods correctly
  - Expected: Android native code compiles without errors

- [ ] **Step 3.4:** Implement JS-side hook
  - Create `src/hooks/useGeofencing.ts` — wraps native module, manages event listeners
  - Test: `src/__tests__/hooks/useGeofencing.test.ts` — mock native module, verify register/unregister calls, event listening
  - Expected: Hook returns correct state, events received and stored

- [ ] **Step 3.5:** Update AndroidManifest.xml
  - Add `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION` permissions
  - Add `FOREGROUND_SERVICE_LOCATION` permission (Android 10+)
  - Test: Manifest parses without errors, permissions declared
  - Expected: Android build includes location permissions

- [ ] **Step 3.6:** Update Info.plist (iOS)
  - Add `NSLocationWhenInUseUsageDescription` and `NSLocationAlwaysAndWhenInUseUsageDescription`
  - Test: Info.plist parses, keys present
  - Expected: iOS build includes location permission descriptions

- [ ] **Step 3.7:** Build and link native modules
  - Command: `cd ios && pod install && cd ..`
  - Expected: Pods installed, both iOS and Android build without errors

- [ ] **Step 3.8:** Real-device test — iOS
  - Deploy to physical iOS device (iOS 13+)
  - Register a geofence at current location + 100m radius
  - Walk outside radius, walk back in
  - Verify: ENTER event received in JS console
  - Background test: background app, trigger geofence from another location
  - Expected: Entry event received while app is backgrounded

- [ ] **Step 3.9:** Real-device test — Android
  - Deploy to physical Android device (API 29+) or emulator with Google Play Services
  - Register a geofence
  - Walk outside radius, walk back in
  - Verify: ENTER event received in JS console
  - Background test: background app, trigger geofence
  - Expected: Entry event received while app is backgrounded

- [ ] **Step 3.10:** Permission flow test (both platforms)
  - Deny location permission → verify `PermissionStatus.locationPermission === 'denied'`
  - Check monitoring warning displayed in UI (placeholder)
  - Expected: Permission denial handled gracefully, no crash

- [ ] **Step 3.11:** Create commit
  - Command: `git add . && git commit -m "feat: native geofencing module — iOS Core Location + Android Geofencing API"`
  - Expected: Clean commit at revision `v3-geofencing-poc`

## Verification Commands

```bash
# TypeScript check (native module interface)
npx tsc --noEmit

# iOS build (includes native module)
cd ios && pod install && cd ..
npx react-native run-ios --simulator "iPhone 14"

# Android build (includes native module)
npx react-native run-android --variant=debug

# Unit tests (JS side)
npx vitest run src/__tests__/native/ src/__tests__/hooks/

# Real-device tests (manual, on physical hardware)
# iOS: Deploy to device, register geofence, walk in/out, verify event logged
# Android: Deploy to device/emulator, register geofence, walk in/out, verify event logged
```

## Drift-Check Command

```bash
git diff v3-geofencing-poc..HEAD -- src/native/ ios/GPSReminder/Geofence* android/app/src/main/java/com/gpsreminder/Geofence* src/hooks/useGeofencing.ts
```
