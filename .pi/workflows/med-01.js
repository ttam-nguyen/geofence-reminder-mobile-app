export const meta = {
  name: 'med-01',
  description: 'MED-01: Wire GeofenceEventProcessor end-to-end (event processor + notification)',
};

const BASE = '/Users/tam/Git/geofence-reminder-mobile-app';

log('=== MED-01: Wire GeofenceEventProcessor ===');

// Step 1: Create the geofence event service that bridges native events to processor
log('Step 1: Create GeofenceEventService (singleton that subscribes to native events)');

const eventService = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: Create a GeofenceEventService that bridges native geofence events to the processor.

Files to CREATE/MODIFY:
- src/services/GeofenceEventService.ts (NEW — singleton service that subscribes to onGeofenceEvent and processes them)
- src/app.tsx (MODIFY — call GeofenceEventService.start() after openDatabase())

Current state:
- src/native/GeofenceEventProcessor.ts — complete, never instantiated. Takes a ReminderRepository and has processEvent()
- src/hooks/useGeofencing.ts — collects events into an array (events: GeofenceEvent[]) but nothing consumes them. Subscribes to onGeofenceEvent()
- src/native/GeofencingModule.ts — has onGeofenceEvent(listener) that returns unsubscribe function
- src/services/NotificationService.ts — complete, has scheduleReminderNotification(reminder) that never gets called
- src/services/RecoveryService.ts — complete, has recoverOnAppStart() that never gets called
- src/services/RegistrationManager.ts — complete, has registerReminder(reminder) and registerAll()
- src/services/ReminderRepository.ts — interfaces (getById, getAll, update, etc.)
- src/data/SQLiteAdapter.ts — actual implementation (openDatabase(), CRUD operations)

What to do:
1. Create src/services/GeofenceEventService.ts — a singleton service that:
   a. Creates a GeofenceEventProcessor instance with the SQLite adapter (as ReminderRepository)
   b. Creates a NotificationService instance with the NotificationModule and delivery repository
   c. Creates a RegistrationManager instance with the SQLite adapter and geofencing module
   d. Subscribes to onGeofenceEvent() from GeofencingModule.ts (NOT the hook — directly from the module)
   e. For each event: call processor.processEvent(event)
   f. After processEvent, if the reminder's status changed to TRIGGERED, call notificationService.scheduleReminderNotification(reminder)
   g. Also call registrationManager.registerAll() on startup (via RecoveryService.recoverOnAppStart())
   h. Provide a start() method that initializes everything and starts the event subscription

2. Modify src/app.tsx to call GeofenceEventService.start() after openDatabase()

3. Ensure error handling: if event processing fails, log the error but don't crash the app

4. The service should be a singleton — one instance for the lifetime of the app

5. Report what was created/modified and whether the geofence bridge is now wired end-to-end`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_changed: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] }, summary: { type: 'string' } }, required: ['task', 'status', 'summary'] } }
);

log(`GeofenceEventService result: ${eventService ? 'success' : 'failed'} — ${JSON.stringify(eventService)}`);

// Step 2: Verify the bridge works by checking that event processing triggers notifications
log('Step 2: Verify notification trigger on TRIGGERED status');

const verifyBridge = await agent(
  `Work on /Users/tam/Git/geofence-reminder-mobile-app. Task: Verify the geofence bridge is correctly wired end-to-end.

Files to READ:
- src/services/GeofenceEventService.ts (should have been created by MED-01 Step 1)
- src/app.tsx (should call GeofenceEventService.start())

What to do:
1. Read src/services/GeofenceEventService.ts and verify:
   a. It creates a GeofenceEventProcessor with the SQLite adapter
   b. It subscribes to onGeofenceEvent from GeofencingModule.ts
   c. It calls processor.processEvent() for each event
   d. After processEvent, if status is TRIGGERED, it calls notificationService.scheduleReminderNotification()
   e. It calls RecoveryService.recoverOnAppStart() on startup

2. Read src/app.tsx and verify it calls GeofenceEventService.start() after openDatabase()

3. Read src/native/GeofencingModule.ts to confirm onGeofenceEvent is the correct API

4. Read src/native/NotificationModule.ts to confirm NotificationModule is available

5. Report whether the bridge is correctly wired end-to-end, and list any issues found

Report what was verified and whether the geofence bridge is correctly wired.`,
  { schema: { type: 'object', properties: { task: { type: 'string' }, files_verified: { type: 'array', items: { type: 'string' } }, status: { type: 'string', enum: ['success', 'failed'] }, summary: { type: 'string' } }, required: ['task', 'status', 'summary'] } }
);

log(`VerifyBridge result: ${verifyBridge ? 'success' : 'failed'} — ${JSON.stringify(verifyBridge)}`);
