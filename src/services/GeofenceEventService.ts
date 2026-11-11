/**
 * Geofence Event Service — singleton bridge from native geofence events to JS processors.
 *
 * Subscribes to onGeofenceEvent() from the native module, creates and owns all
 * downstream services (processor, notification, registration, recovery), and
 * dispatches each event through the state machine.
 *
 * Usage: call start() once during app initialization (in src/app.tsx).
 */

import { GeofenceEventProcessor } from '../native/GeofenceEventProcessor';
import { NotificationService } from './NotificationService';
import { RegistrationManager } from './RegistrationManager';
import { RecoveryService } from './RecoveryService';
import { sqliteReminderRepository } from '../data/ReminderRepositoryImpl';
import { sqliteNotificationLogRepository } from '../data/ReminderRepositoryImpl';
import {
  onGeofenceEvent,
  registerGeofence,
  unregisterGeofence,
  unregisterAllGeofences,
  checkPermissions,
  requestLocationPermission,
  requestBackgroundPermission,
  isGooglePlayServicesAvailable,
} from '../native/GeofencingModule';
import { NotificationModule } from '../native/NotificationModule';
import { ReminderStatus } from '../models/ReminderStatus';

// --- Singleton instances ---

let processor: GeofenceEventProcessor | null = null;
let notificationService: NotificationService | null = null;
let registrationManager: RegistrationManager | null = null;
let recoveryService: RecoveryService | null = null;
let unsubscribeEvent: (() => void) | null = null;
let isStarted = false;

/**
 * Initialize all service instances and start the event subscription.
 * Must be called exactly once during app startup (after openDatabase()).
 */
export function startGeofenceEventService(): void {
  if (isStarted) {
    return; // Already started — idempotent
  }

  isStarted = true;

  // Create the event processor (bridges native events → state transitions)
  processor = new GeofenceEventProcessor(sqliteReminderRepository);

  // Create the notification service (schedules local notifications)
  notificationService = new NotificationService(NotificationModule, sqliteNotificationLogRepository);

  // Create the registration manager (maps reminders ↔ native geofences)
  registrationManager = new RegistrationManager(
    sqliteReminderRepository,
    {
      registerGeofence,
      unregisterGeofence,
      unregisterAllGeofences,
      checkPermissions,
      requestLocationPermission,
      requestBackgroundPermission,
      isGooglePlayServicesAvailable,
    },
  );

  // Create the recovery service (re-registers eligible reminders on startup)
  recoveryService = new RecoveryService(
    sqliteReminderRepository,
    registrationManager,
    sqliteNotificationLogRepository,
  );

  // Run recovery: re-register all eligible (ARMED/WAITING_FOR_EXIT) reminders
  recoveryService.recoverOnAppStart().catch((err) => {
    console.error('[GeofenceEventService] Recovery failed:', err);
  });

  // Subscribe to native geofence events (ENTER/EXIT)
  unsubscribeEvent = onGeofenceEvent(async (event) => {
    try {
      await processEvent(event);

      // After processing, check if the reminder was just triggered
      const reminder = await sqliteReminderRepository.getById(event.requestId);
      if (reminder && reminder.status === ReminderStatus.TRIGGERED) {
        // Schedule the notification for this triggered reminder
        await notificationService!.scheduleReminderNotification(reminder);
      }
    } catch (error) {
      // Log but don't crash — native events may reference deleted reminders
      console.error('[GeofenceEventService] Event processing error:', error);
    }
  });

  console.log('[GeofenceEventService] Started — listening for geofence events');
}

/** Process a single geofence event through the state machine. */
async function processEvent(event: { requestId: string; eventType: 'ENTER' | 'EXIT' }): Promise<void> {
  if (!processor) {
    throw new Error('[GeofenceEventService] Not started — call start() first');
  }

  await processor.processEvent(event as any); // GeofenceEvent shape matches { requestId, eventType }
}

/** Unsubscribe from events and clean up (for testing / shutdown). */
export function stopGeofenceEventService(): void {
  if (unsubscribeEvent) {
    unsubscribeEvent();
    unsubscribeEvent = null;
  }

  processor = null;
  notificationService = null;
  registrationManager = null;
  recoveryService = null;
  isStarted = false;

  console.log('[GeofenceEventService] Stopped');
}

/** Get the current processor instance (for testing). */
export function getProcessor(): GeofenceEventProcessor | null {
  return processor;
}

/** Get the current notification service instance (for testing). */
export function getNotificationService(): NotificationService | null {
  return notificationService;
}

/** Get the current registration manager instance (for testing). */
export function getRegistrationManager(): RegistrationManager | null {
  return registrationManager;
}
