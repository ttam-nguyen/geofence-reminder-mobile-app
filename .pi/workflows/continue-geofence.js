export const meta = {
  name: 'continue-geofence',
  description: 'Continue from where aborted workflows left off — MED-01: Wire GeofenceEventProcessor',
};

const BASE = '/Users/tam/Git/geofence-reminder-mobile-app';

// MED-01: Wire GeofenceEventProcessor — this is the critical geofence bridge
log('=== MED-01: Wire GeofenceEventProcessor ===');

const result = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: MED-01 — Wire GeofenceEventProcessor end-to-end.

Current state (from git diff): CRIT-03, CRIT-04, HIGH-01, HIGH-02, HIGH-03, CRIT-01 are all done. The native modules (GeofencingModule) are registered and working. LocationService uses real GPS. SearchService uses Mapbox/Nominatim. MapView renders a real map with markers and circles.

Files involved:
- src/native/GeofenceEventProcessor.ts (logic complete and correct, never instantiated)
- src/hooks/useGeofencing.ts (collects events but nothing consumes them — the hook returns an array of events that nobody reads)
- src/native/GeofencingModule.ts (JS bridge to native — has onGeofenceEvent listener)
- src/services/NotificationService.ts (JS layer complete — scheduleReminderNotification exists but never called)
- src/app.tsx (currently only calls openDatabase() — needs to start the event processor)

What to do:
1. Read src/native/GeofenceEventProcessor.ts to understand the processing logic (state machine transitions, idempotency)
2. Read src/hooks/useGeofencing.ts to see how events are collected (into an array, never consumed)
3. Create a service that listens to onGeofenceEvent (from GeofencingModule.ts) — this should be a singleton that runs for the lifetime of the app
4. Create a GeofenceEventProcessor instance with the reminder repository (from SQLite)
5. Call processEvent() for each incoming event — this triggers status transitions (ARMED→TRIGGERED, WAITING_FOR_EXIT→ARMED)
6. Wire this into app.tsx startup so it runs when the app starts (after openDatabase())
7. Ensure error handling for recovery failures (don't crash the app if event processing fails)
8. Report what was implemented and whether the GeofenceEventProcessor now processes events end-to-end

Important: The app currently has stubbed/working UI but the geofence bridge is completely broken. When a reminder transitions to TRIGGERED, it should call notificationService.scheduleReminderNotification(reminder) to fire a local notification.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] }, summary: { type: 'string' } }, required: ['task', 'status', 'summary'] } }
);

log(`MED-01 result: ${result ? 'success' : 'failed'} — ${JSON.stringify(result)}`);
