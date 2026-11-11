export const meta = {
  name: 'pm-workflow',
  description: 'Project manager workflow for geofence-reminder-mobile-app TODO implementation',
};

const BASE = '/Users/tam/Git/geofence-reminder-mobile-app';

// Phase 1: CRIT-03 (prerequisite for everything)
log('=== PHASE 1: CRIT-03 — Register native modules in build config ===');

const crit03 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: CRIT-03 — Register native modules in build config.

Files to modify:
- android/app/src/main/java/com/geofencereminder/MainApplication.kt (add GeofencingPackage to getpackages())
- android/app/src/main/AndroidManifest.xml (add all declared permissions: ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION, ACCESS_BACKGROUND_LOCATION, POST_NOTIFICATIONS, FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION)
- ios/GeofenceReminder/Info.plist (add NSLocationWhenInUseUsageDescription, NSLocationAlwaysAndWhenInUseUsageDescription, NSLocationAlwaysUsageDescription)
- ios/GeofenceReminder/Info.plist-permissions (documentation stub — copy values to actual Info.plist)

Current state: Native code exists in native-modules/ but is NOT linked into the app build. AndroidManifest.xml only has a documentation stub (AndroidManifest-permissions.xml). Info.plist only has a documentation stub (Info.plist-permissions).

What to do:
1. Read the actual AndroidManifest.xml and Info.plist files to see current state
2. Read native-modules/android/GeofencingPackage.kt and native-modules/ios/GeofenceManager.swift to understand what the native module provides
3. Register GeofencingPackage in MainApplication.kt's getpackages() method
4. Add all required permissions to the actual AndroidManifest.xml (from the stub file)
5. Add location permission descriptions to the actual Info.plist (from the stub file)
6. Ensure react-native-sqlite-storage is properly linked (check MainApplication.kt for SQLitePackage)
7. Verify the changes compile by running: cd $BASE && npx react-native doctor

Report what was changed and whether the build config is now correct.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 1' }
);

log(`CRIT-03 result: ${crit03 ? 'success' : 'failed'} — ${JSON.stringify(crit03)}`);

// Phase 2: CRIT-02 + CRIT-04 (parallel — native module linking + real GPS)
log('=== PHASE 2: CRIT-02 (native bridge) + CRIT-04 (real GPS) ===');

const crit02 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: CRIT-02 — Connect native GeofencingModule to JS bridge.

Files involved:
- src/native/GeofencingModule.ts (JS bridge — already complete, null-safe)
- native-modules/ios/GeofenceManager.swift (native iOS implementation — already complete)
- native-modules/android/GeofenceManager.kt (native Android implementation — already complete)

Current state: The JS bridge in GeofencingModule.ts is complete and null-safe, returning errors if the native module is missing. The native code (Swift for iOS, Kotlin for Android) is fully implemented with all required methods: requestPermissions, checkPermissionStatus, registerGeofences, unregisterGeofence, removeNotificationListener.

What to do:
1. Verify the JS bridge in src/native/GeofencingModule.ts is correctly structured (exponent, methods, event listener)
2. Check that the native modules export their classes correctly (GeofenceManager.swift, GeofenceManager.kt)
3. Verify the bridge is properly exported via native-bridge.ts or similar index file
4. Run a quick test: import GeofencingModule and log its methods to verify no runtime errors
5. Report any issues found in the bridge wiring

Report what was verified and whether the JS-to-native bridge is correctly wired.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 2' }
);

const crit04 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: CRIT-04 — Implement real GPS location.

Files to modify:
- src/services/LocationService.ts (currently stubbed — returns hardcoded SF coords 37.7749, -122.4194)
- src/hooks/useCurrentLocation.ts (calls LocationService — should work once service is fixed)

What to do:
1. Read src/services/LocationService.ts to see the stubbed implementation
2. Replace getCurrentPosition() with react-native-geolocation-service.getCurrentPosition()
3. Implement watchPosition() using Geolocation.watchPosition()
4. Keep the same interface — LocationService.getCurrentPosition() and watchPosition()
5. Ensure proper error handling for denied permissions
6. Verify the hook in useCurrentLocation.ts will work with the updated service
7. Report what was changed

Report what was implemented and whether the GPS service now works end-to-end.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 2' }
);

log(`CRIT-02 result: ${crit02 ? 'success' : 'failed'} — ${JSON.stringify(crit02)}`);
log(`CRIT-04 result: ${crit04 ? 'success' : 'failed'} — ${JSON.stringify(crit04)}`);

// Phase 3: CRIT-01 (wire MapView with real map + GPS data)
log('=== PHASE 3: CRIT-01 — Wire MapView with real map ===');

const crit01 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: CRIT-01 — Wire up MapView to react-native-maps.

Files to modify:
- src/ui/MapView.tsx (currently stubbed — renders empty <View>, children slot passes through but no map is rendered)
- src/navigation/AppNavigator.tsx (MapScreenContainer — passes currentLocation={null} always)

What to do:
1. Read src/ui/MapView.tsx to see the stubbed implementation
2. Replace the empty <View> with <MapView from 'react-native-maps'>
3. Wire currentLocation to a Marker component
4. Wire reminderPins to Marker components (with custom icons if available)
5. Wire radiusCircle to a Polygon or circle overlay (react-native-maps has Circle component)
6. Fix MapScreenContainer in AppNavigator.tsx to pass real currentLocation (not null)
7. Ensure proper styling (width: '100%', height: '100%')
8. Report what was changed

Report what was implemented and whether the MapView now renders a real map with markers and circles.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 3' }
);

log(`CRIT-01 result: ${crit01 ? 'success' : 'failed'} — ${JSON.stringify(crit01)}`);

// Phase 4: HIGH-02 + HIGH-03 (parallel — standalone)
log('=== PHASE 4: HIGH-02 (ReminderListScreen) + HIGH-03 (Search API) ===');

const high02 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: HIGH-02 — Wire ReminderListScreen with real data.

Files to modify:
- src/navigation/AppNavigator.tsx (ReminderListContainer — passes reminders={[]})
- src/ui/ReminderListScreen.tsx (UI is complete, shows reminder list, detail navigation)

What to do:
1. Read src/navigation/AppNavigator.tsx to see the ReminderListContainer
2. Change it to read from useReminderStore((s) => s.reminders) and pass them to ReminderListScreen
3. Verify the ReminderListScreen UI correctly displays the reminder data (title, status badge, etc.)
4. Ensure navigation to ReminderDetailScreen works with real data
5. Report what was changed

Report what was implemented and whether the ReminderListScreen now shows real reminders.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 4' }
);

const high03 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: HIGH-03 — Integrate real place search (geocoding API).

Files to modify:
- src/services/SearchService.ts (currently stubbed — returns mock SF results for any query. isOnline() always returns true)
- package.json (check if @react-native-community/netinfo is installed for real offline detection)

What to do:
1. Read src/services/SearchService.ts to see the stubbed implementation
2. Replace isOnline() with a real check using @react-native-community/netinfo (check if installed, if not install it)
3. Uncomment and integrate the Mapbox geocoding API call (needs MAPBOX_TOKEN env var) — if no token available, fall back to Nominatim (OpenStreetMap) which is free but rate-limited (1 req/sec)
4. Implement searchPlacesInArea with bounding box support
5. Keep the same interface — SearchService.searchPlaces(query) and searchPlacesInArea(bounds, query)
6. Report what was changed

Report what was implemented and whether the search service now works with a real API.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 4' }
);

log(`HIGH-02 result: ${high02 ? 'success' : 'failed'} — ${JSON.stringify(high02)}`);
log(`HIGH-03 result: ${high03 ? 'success' : 'failed'} — ${JSON.stringify(high03)}`);

// Phase 5: HIGH-01 + HIGH-04 (parallel — depend on CRIT-01)
log('=== PHASE 5: HIGH-01 (MapScreen data) + HIGH-04 (MapPin interaction) ===');

const high01 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: HIGH-01 — Wire MapScreen with real data and current location.

Files to modify:
- src/navigation/AppNavigator.tsx (MapScreenContainer — passes reminders={[]})
- src/ui/MapScreen.tsx (passes currentLocation={null} always)

What to do:
1. Read src/navigation/AppNavigator.tsx to see the MapScreenContainer
2. Change it to read from useReminderStore((s) => s.reminders) and pass them to MapScreen
3. Read src/ui/MapScreen.tsx — it passes currentLocation={null} — fix this by reading from useCurrentLocation()
4. Ensure the MapScreen correctly displays: all reminders on the map, current location marker, saved places group
5. Verify the two-row layout (top map preview + bottom collapsible list) works with real data
6. Report what was changed

Report what was implemented and whether the MapScreen now shows real reminders and current location.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 5' }
);

const high04 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: HIGH-04 — Wire MapPin interaction for map-based location selection.

Files to modify:
- src/hooks/useMapPin.ts (logic exists — manages pin state and radius)
- src/ui/CreateReminderScreen.tsx (handleMapSelect stubbed — shows "not yet implemented" Alert)
- src/ui/MapView.tsx (needs to support onMapTap prop for map pin interaction)

What to do:
1. Read src/hooks/useMapPin.ts to see the existing logic (manages pin state and radius)
2. Read src/ui/CreateReminderScreen.tsx to see the stubbed handleMapSelect()
3. Add onMapTap prop support to MapView (src/ui/MapView.tsx) — when user taps the map, call the callback with coordinates
4. Integrate with the MapView component so tapping the map calls onMapTap
5. Pass the tapped coordinates to setSelectedLocation() with source: LocationSource.MAP_PIN
6. Ensure the useMapPin hook's pin state and radius are properly displayed on the map
7. Report what was changed

Report what was implemented and whether map pin interaction now works for location selection.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 5' }
);

log(`HIGH-01 result: ${high01 ? 'success' : 'failed'} — ${JSON.stringify(high01)}`);
log(`HIGH-04 result: ${high04 ? 'success' : 'failed'} — ${JSON.stringify(high04)}`);

// Phase 6: HIGH-05 (depends on HIGH-03)
log('=== PHASE 6: HIGH-05 — MapCacheService ===');

const high05 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: HIGH-05 — Wire MapCacheService with real offline tile storage.

Files to modify:
- src/services/MapCacheService.ts (currently stubbed — all methods on in-memory array, return mock results)
- src/services/SearchService.ts (isOnline() from NetInfo — should be wired by HIGH-03)

What to do:
1. Read src/services/MapCacheService.ts to see the stubbed implementation
2. Integrate with react-native-maps offline packaging (Mapbox or equivalent)
3. Persist cached areas to SQLite (use existing SQLiteAdapter)
4. Check isOnline() from NetInfo before downloading tiles
5. Implement getTileCacheKey(), saveTile(), getCachedTile() with real persistence
6. Report what was changed

Report what was implemented and whether the MapCacheService now persists tiles to SQLite.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 6' }
);

log(`HIGH-05 result: ${high05 ? 'success' : 'failed'} — ${JSON.stringify(high05)}`);

// Phase 7: MED-01 + MED-02 (parallel — event processor + notification)
log('=== PHASE 7: MED-01 (EventProcessor) + MED-02 (NotificationService) ===');

const med01 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: MED-01 — Implement GeofenceEventProcessor end-to-end lifecycle.

Files to modify:
- src/native/GeofenceEventProcessor.ts (logic complete and correct, never instantiated)
- src/hooks/useGeofencing.ts (collects events but nothing consumes them)

What to do:
1. Read src/native/GeofenceEventProcessor.ts to understand the processing logic (state machine transitions, idempotency)
2. Read src/hooks/useGeofencing.ts to see how events are collected (into an array, never consumed)
3. Create a service that listens to onGeofenceEvent (from GeofencingModule.ts)
4. Create a GeofenceEventProcessor instance with the reminder repository
5. Call processEvent() for each incoming event — this triggers status transitions (ARMED→TRIGGERED, WAITING_FOR_EXIT→ARMED)
6. Wire this into app.tsx startup so it runs for the lifetime of the app
7. Report what was implemented

Report what was implemented and whether the GeofenceEventProcessor now processes events end-to-end.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 7' }
);

const med02 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: MED-02 — Connect NotificationService to triggered reminders.

Files to modify:
- src/services/NotificationService.ts (JS layer complete)
- native-modules/ios/NotificationModule.swift (native iOS — fully implemented with UNUserNotificationCenter)
- native-modules/android/NotificationModule.kt (native Android — fully implemented with NotificationManager)

What to do:
1. Read src/services/NotificationService.ts to see the JS layer (scheduleReminderNotification, cancelNotification)
2. Verify native iOS (UNUserNotificationCenter) and Android (NotificationManager) are fully implemented
3. When a reminder transitions to TRIGGERED (via GeofenceEventProcessor), call notificationService.scheduleReminderNotification(reminder)
4. Ensure Android notification channel 'gps_reminder_channel' is created on app startup (NotificationModule.kt references it but never creates it)
5. Ensure iOS handles notification categories properly (sound + vibration)
6. Report what was changed

Report what was implemented and whether notifications now fire when reminders transition to TRIGGERED.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 7' }
);

log(`MED-01 result: ${med01 ? 'success' : 'failed'} — ${JSON.stringify(med01)}`);
log(`MED-02 result: ${med02 ? 'success' : 'failed'} — ${JSON.stringify(med02)}`);

// Phase 8: MED-03 (depends on both above)
log('=== PHASE 8: MED-03 — RecoveryService ===');

const med03 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: MED-03 — Wire RecoveryService into app startup.

Files to modify:
- src/services/RecoveryService.ts (logic complete, called nowhere)
- src/app.tsx (only calls openDatabase() — needs to call RecoveryService.recoverOnAppStart())

What to do:
1. Read src/services/RecoveryService.ts to understand the recovery logic (re-registers all ARMED/WAITING_FOR_EXIT reminders as native geofences)
2. Read src/app.tsx to see current startup sequence (only openDatabase())
3. After openDatabase(), instantiate and call RecoveryService.recoverOnAppStart() to re-register all ARMED/WAITING_FOR_EXIT reminders as native geofences
4. Ensure error handling for recovery failures (don't crash the app if recovery fails)
5. Report what was changed

Report what was implemented and whether RecoveryService now runs on app startup.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 8' }
);

log(`MED-03 result: ${med03 ? 'success' : 'failed'} — ${JSON.stringify(med03)}`);

// Phase 9: LOW items (polish)
log('=== PHASE 9: LOW-01 to LOW-05 (Polish) ===');

const low01 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: LOW-01 — Enable real notification sound/vibration on triggered reminders.

Files to modify:
- native-modules/ios/NotificationModule.swift (uses .default sound)
- native-modules/android/NotificationModule.kt (uses DEFAULT_NOTIFICATION_URI, needs channel creation on startup)

What to do:
1. Read native-modules/ios/NotificationModule.swift — verify it uses .default sound for notifications
2. Read native-modules/android/NotificationModule.kt — verify it uses DEFAULT_NOTIFICATION_URI and vibration patterns
3. Ensure Android notification channel 'gps_reminder_channel' is created on app startup (NotificationModule.kt references it but never creates it)
4. Ensure iOS handles notification categories properly (sound + vibration)
5. Report what was changed

Report what was implemented and whether notifications now play sound/vibration when triggered.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 9' }
);

const low02 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: LOW-02 — Add App Icon and Splash Screen.

Files to check:
- assets/ directory (referenced in app.tsx as '../../assets/backgrounds/glass_frosted_geometric_background.png')
- ios/GeofenceReminder/Assets.xcassets (app icons)
- android/app/src/main/res/ (splash screen, app icons)

What to do:
1. Check if assets/backgrounds/glass_frosted_geometric_background.png exists
2. If missing, create a placeholder or find an existing one to use
3. Check iOS and Android app icon assets — create placeholders if missing
4. Ensure splash screen images exist for both platforms
5. Report what was found and changed

Report what was implemented and whether app icons/splash screen are now present.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 9' }
);

const low03 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: LOW-03 — Release hardening (error boundaries, logging).

Files to modify:
- src/app.tsx (basic error handling exists — database init catches errors)

What to do:
1. Read src/app.tsx to see current error handling (database init catches errors)
2. Add React ErrorBoundary wrapper around the app
3. Add basic crash reporting (Sentry or Firebase Crashlytics — if not installed, add a simple error logger)
4. Add analytics for reminder creation/completion rates (simple logging to console + SQLite)
5. Report what was changed

Report what was implemented and whether error boundaries/crash reporting are now in place.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 9' }
);

const low04 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: LOW-04 — Theme system — finalize dark mode toggle.

Files to modify:
- src/theme/ThemeContext.tsx (theme context and color tokens defined)
- src/theme/colors.ts (color tokens)
- src/ui/SettingsScreen.tsx (add settings UI toggle for dark/light mode)

What to do:
1. Read src/theme/ThemeContext.tsx to see the current theme context
2. Add a settings UI toggle for dark/light mode in SettingsScreen.tsx
3. Persist preference to SQLite or AsyncStorage
4. Ensure the AppNavigator uses the theme from context (tab bar colors already reference it)
5. Report what was changed

Report what was implemented and whether the dark mode toggle now works.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 9' }
);

const low05 = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: LOW-05 — Ads integration (react-native-google-mobile-ads).

Files to modify:
- package.json (already has react-native-google-mobile-ads installed)
- src/ui/ReminderListScreen.tsx (add ad banners to reminder list)
- src/ui/SettingsScreen.tsx (add rewarded ads option)

What to do:
1. Read package.json to verify react-native-google-mobile-ads is installed
2. Integrate ad banners into ReminderListScreen (clearly labeled, visually separated from reminders)
3. Add optional rewarded ads in SettingsScreen (user-initiated, does not block core functionality)
4. Ensure ad failure/offline does not affect reminder functionality (graceful degradation)
5. Report what was changed

Report what was implemented and whether ads are now integrated into the app.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] } }, required: ['task', 'status'] } },
  { phase: 'Phase 9' }
);

log(`LOW-01 result: ${low01 ? 'success' : 'failed'} — ${JSON.stringify(low01)}`);
log(`LOW-02 result: ${low02 ? 'success' : 'failed'} — ${JSON.stringify(low02)}`);
log(`LOW-03 result: ${low03 ? 'success' : 'failed'} — ${JSON.stringify(low03)}`);
log(`LOW-04 result: ${low04 ? 'success' : 'failed'} — ${JSON.stringify(low04)}`);
log(`LOW-05 result: ${low05 ? 'success' : 'failed'} — ${JSON.stringify(low05)}`);

// Summary
log('=== WORKFLOW COMPLETE ===');
const allResults = {
  'CRIT-03': crit03,
  'CRIT-02': crit02,
  'CRIT-04': crit04,
  'CRIT-01': crit01,
  'HIGH-02': high02,
  'HIGH-03': high03,
  'HIGH-01': high01,
  'HIGH-04': high04,
  'HIGH-05': high05,
  'MED-01': med01,
  'MED-02': med02,
  'MED-03': med03,
  'LOW-01': low01,
  'LOW-02': low02,
  'LOW-03': low03,
  'LOW-04': low04,
  'LOW-05': low05,
};

const successCount = Object.values(allResults).filter(r => r !== null && r.status === 'success').length;
const failureCount = Object.values(allResults).filter(r => r !== null && r.status === 'failed').length;

log(`Summary: ${successCount} succeeded, ${failureCount} failed`);
log(JSON.stringify(allResults, null, 2));
