import { processGeofenceEvent, GeofenceEventType } from '../eventProcessor';
import { ReminderStatus } from '../../types/Reminder';

describe('processGeofenceEvent', () => {
  it('DRAFT + ENTER → WAITING_FOR_EXIT', () => {
    const result = processGeofenceEvent(ReminderStatus.DRAFT, GeofenceEventType.ENTER);
    expect(result.newStatus).toBe(ReminderStatus.WAITING_FOR_EXIT);
    expect(result.transitioned).toBe(true);
    expect(result.previousStatus).toBe(ReminderStatus.DRAFT);
  });

  it('DRAFT + EXIT → no transition (stays DRAFT)', () => {
    const result = processGeofenceEvent(ReminderStatus.DRAFT, GeofenceEventType.EXIT);
    expect(result.newStatus).toBe(ReminderStatus.DRAFT);
    expect(result.transitioned).toBe(false);
  });

  it('WAITING_FOR_EXIT + EXIT → ARMED', () => {
    const result = processGeofenceEvent(
      ReminderStatus.WAITING_FOR_EXIT,
      GeofenceEventType.EXIT,
    );
    expect(result.newStatus).toBe(ReminderStatus.ARMED);
    expect(result.transitioned).toBe(true);
  });

  it('WAITING_FOR_EXIT + ENTER → no transition (stays WAITING_FOR_EXIT)', () => {
    const result = processGeofenceEvent(
      ReminderStatus.WAITING_FOR_EXIT,
      GeofenceEventType.ENTER,
    );
    expect(result.newStatus).toBe(ReminderStatus.WAITING_FOR_EXIT);
    expect(result.transitioned).toBe(false);
  });

  it('ARMED + ENTER → ARRIVAL_PENDING', () => {
    const result = processGeofenceEvent(ReminderStatus.ARMED, GeofenceEventType.ENTER);
    expect(result.newStatus).toBe(ReminderStatus.ARRIVAL_PENDING);
    expect(result.transitioned).toBe(true);
  });

  it('ARMED + EXIT → no transition (entry-only reminders)', () => {
    const result = processGeofenceEvent(ReminderStatus.ARMED, GeofenceEventType.EXIT);
    expect(result.newStatus).toBe(ReminderStatus.ARMED);
    expect(result.transitioned).toBe(false);
  });

  it('ARRIVAL_PENDING + EXIT → ARMED (user left before confirmation)', () => {
    const result = processGeofenceEvent(
      ReminderStatus.ARRIVAL_PENDING,
      GeofenceEventType.EXIT,
    );
    expect(result.newStatus).toBe(ReminderStatus.ARMED);
    expect(result.transitioned).toBe(true);
  });

  it('ARRIVAL_PENDING + ENTER → no transition (timer continues)', () => {
    const result = processGeofenceEvent(
      ReminderStatus.ARRIVAL_PENDING,
      GeofenceEventType.ENTER,
    );
    expect(result.newStatus).toBe(ReminderStatus.ARRIVAL_PENDING);
    expect(result.transitioned).toBe(false);
  });

  it('TRIGGERED + ENTER → no transition (terminal, idempotent)', () => {
    const result = processGeofenceEvent(ReminderStatus.TRIGGERED, GeofenceEventType.ENTER);
    expect(result.newStatus).toBe(ReminderStatus.TRIGGERED);
    expect(result.transitioned).toBe(false);
  });

  it('TRIGGERED + EXIT → no transition (terminal, idempotent)', () => {
    const result = processGeofenceEvent(ReminderStatus.TRIGGERED, GeofenceEventType.EXIT);
    expect(result.newStatus).toBe(ReminderStatus.TRIGGERED);
    expect(result.transitioned).toBe(false);
  });

  it('COMPLETED ignores all events', () => {
    const enterResult = processGeofenceEvent(ReminderStatus.COMPLETED, GeofenceEventType.ENTER);
    expect(enterResult.newStatus).toBe(ReminderStatus.COMPLETED);
    expect(enterResult.transitioned).toBe(false);

    const exitResult = processGeofenceEvent(ReminderStatus.COMPLETED, GeofenceEventType.EXIT);
    expect(exitResult.newStatus).toBe(ReminderStatus.COMPLETED);
    expect(exitResult.transitioned).toBe(false);
  });

  it('PAUSED ignores all events', () => {
    const enterResult = processGeofenceEvent(ReminderStatus.PAUSED, GeofenceEventType.ENTER);
    expect(enterResult.newStatus).toBe(ReminderStatus.PAUSED);
    expect(enterResult.transitioned).toBe(false);

    const exitResult = processGeofenceEvent(ReminderStatus.PAUSED, GeofenceEventType.EXIT);
    expect(exitResult.newStatus).toBe(ReminderStatus.PAUSED);
    expect(exitResult.transitioned).toBe(false);
  });

  it('CANCELLED ignores all events', () => {
    const result = processGeofenceEvent(ReminderStatus.CANCELLED, GeofenceEventType.ENTER);
    expect(result.newStatus).toBe(ReminderStatus.CANCELLED);
    expect(result.transitioned).toBe(false);
  });

  it('DELETED ignores all events', () => {
    const result = processGeofenceEvent(ReminderStatus.DELETED, GeofenceEventType.ENTER);
    expect(result.newStatus).toBe(ReminderStatus.DELETED);
    expect(result.transitioned).toBe(false);
  });

  it('produces correct EventProcessingResult shape', () => {
    const result = processGeofenceEvent(ReminderStatus.DRAFT, GeofenceEventType.ENTER);
    expect(result).toHaveProperty('newStatus', ReminderStatus.WAITING_FOR_EXIT);
    expect(result).toHaveProperty('transitioned', true);
    expect(result).toHaveProperty('previousStatus', ReminderStatus.DRAFT);
  });
});
