import {
  VALID_TRANSITIONS,
  isValidTransition,
  validateTransition,
} from '../stateMachine';
import { ReminderStatus } from '../../types/Reminder';

describe('stateMachine', () => {
  describe('VALID_TRANSITIONS', () => {
    it('defines transitions for all ReminderStatus values', () => {
      const statuses = Object.values(ReminderStatus);
      for (const status of statuses) {
        expect(VALID_TRANSITIONS[status]).toBeDefined();
      }
    });

    it('has exactly 25 valid transitions (counting edges, including ARRIVAL_PENDING)', () => {
      let total = 0;
      for (const destinations of Object.values(VALID_TRANSITIONS)) {
        total += destinations.size;
      }
      expect(total).toBe(25);
    });

    it('defines DRAFT transitions: ARMED, WAITING_FOR_EXIT, COMPLETED, CANCELLED, PAUSED', () => {
      const draft = VALID_TRANSITIONS[ReminderStatus.DRAFT];
      expect(draft.has(ReminderStatus.ARMED)).toBe(true);
      expect(draft.has(ReminderStatus.WAITING_FOR_EXIT)).toBe(true);
      expect(draft.has(ReminderStatus.COMPLETED)).toBe(true);
      expect(draft.has(ReminderStatus.CANCELLED)).toBe(true);
      expect(draft.has(ReminderStatus.PAUSED)).toBe(true);
      expect(draft.size).toBe(5);
    });

    it('defines WAITING_FOR_EXIT transitions: ARMED, COMPLETED, CANCELLED, PAUSED', () => {
      const wfe = VALID_TRANSITIONS[ReminderStatus.WAITING_FOR_EXIT];
      expect(wfe.has(ReminderStatus.ARMED)).toBe(true);
      expect(wfe.has(ReminderStatus.COMPLETED)).toBe(true);
      expect(wfe.has(ReminderStatus.CANCELLED)).toBe(true);
      expect(wfe.has(ReminderStatus.PAUSED)).toBe(true);
      expect(wfe.size).toBe(4);
    });

    it('defines ARMED transitions: TRIGGERED, ARRIVAL_PENDING, COMPLETED, CANCELLED, PAUSED', () => {
      const armed = VALID_TRANSITIONS[ReminderStatus.ARMED];
      expect(armed.has(ReminderStatus.TRIGGERED)).toBe(true);
      expect(armed.has(ReminderStatus.ARRIVAL_PENDING)).toBe(true);
      expect(armed.has(ReminderStatus.COMPLETED)).toBe(true);
      expect(armed.has(ReminderStatus.CANCELLED)).toBe(true);
      expect(armed.has(ReminderStatus.PAUSED)).toBe(true);
      expect(armed.size).toBe(5);
    });

    it('defines ARRIVAL_PENDING transitions: TRIGGERED, ARMED', () => {
      const ap = VALID_TRANSITIONS[ReminderStatus.ARRIVAL_PENDING];
      expect(ap.has(ReminderStatus.TRIGGERED)).toBe(true);
      expect(ap.has(ReminderStatus.ARMED)).toBe(true);
      expect(ap.size).toBe(2);
    });

    it('defines TRIGGERED as terminal: only COMPLETED', () => {
      const triggered = VALID_TRANSITIONS[ReminderStatus.TRIGGERED];
      expect(triggered.has(ReminderStatus.COMPLETED)).toBe(true);
      expect(triggered.size).toBe(1);
    });

    it('defines COMPLETED transitions: DRAFT, CANCELLED', () => {
      const completed = VALID_TRANSITIONS[ReminderStatus.COMPLETED];
      expect(completed.has(ReminderStatus.DRAFT)).toBe(true);
      expect(completed.has(ReminderStatus.CANCELLED)).toBe(true);
      expect(completed.size).toBe(2);
    });

    it('defines CANCELLED transition: DRAFT', () => {
      const cancelled = VALID_TRANSITIONS[ReminderStatus.CANCELLED];
      expect(cancelled.has(ReminderStatus.DRAFT)).toBe(true);
      expect(cancelled.size).toBe(1);
    });

    it('defines PAUSED transitions: ARMED, WAITING_FOR_EXIT, COMPLETED, CANCELLED', () => {
      const paused = VALID_TRANSITIONS[ReminderStatus.PAUSED];
      expect(paused.has(ReminderStatus.ARMED)).toBe(true);
      expect(paused.has(ReminderStatus.WAITING_FOR_EXIT)).toBe(true);
      expect(paused.has(ReminderStatus.COMPLETED)).toBe(true);
      expect(paused.has(ReminderStatus.CANCELLED)).toBe(true);
      expect(paused.size).toBe(4);
    });

    it('defines DELETED (alias for CANCELLED) transitions: DRAFT', () => {
      const deleted = VALID_TRANSITIONS[ReminderStatus.DELETED];
      expect(deleted.has(ReminderStatus.DRAFT)).toBe(true);
      expect(deleted.size).toBe(1);
    });

    it('prevents DRAFT → TRIGGERED (must go through ARMED/ARRIVAL_PENDING first)', () => {
      const draft = VALID_TRANSITIONS[ReminderStatus.DRAFT];
      expect(draft.has(ReminderStatus.TRIGGERED)).toBe(false);
    });

    it('prevents DRAFT → ARRIVAL_PENDING (must go through ARMED first)', () => {
      const draft = VALID_TRANSITIONS[ReminderStatus.DRAFT];
      expect(draft.has(ReminderStatus.ARRIVAL_PENDING)).toBe(false);
    });

    it('prevents TRIGGERED → CANCELLED (terminal state)', () => {
      const triggered = VALID_TRANSITIONS[ReminderStatus.TRIGGERED];
      expect(triggered.has(ReminderStatus.CANCELLED)).toBe(false);
    });

    it('prevents TRIGGERED → ARMED (no re-arming)', () => {
      const triggered = VALID_TRANSITIONS[ReminderStatus.TRIGGERED];
      expect(triggered.has(ReminderStatus.ARMED)).toBe(false);
    });

    it('prevents TRIGGERED → ARRIVAL_PENDING (no re-arming)', () => {
      const triggered = VALID_TRANSITIONS[ReminderStatus.TRIGGERED];
      expect(triggered.has(ReminderStatus.ARRIVAL_PENDING)).toBe(false);
    });

    it('prevents self-transitions (e.g., DRAFT → DRAFT)', () => {
      for (const status of Object.values(ReminderStatus)) {
        const transitions = VALID_TRANSITIONS[status];
        expect(transitions.has(status)).toBe(false);
      }
    });
  });

  describe('isValidTransition', () => {
    it('returns true for all valid transitions defined in VALID_TRANSITIONS', () => {
      for (const [fromStr, toSet] of Object.entries(VALID_TRANSITIONS)) {
        const from = fromStr as ReminderStatus;
        for (const to of toSet) {
          expect(isValidTransition(from, to)).toBe(true);
        }
      }
    });

    it('returns false for invalid transitions', () => {
      expect(isValidTransition(ReminderStatus.DRAFT, ReminderStatus.TRIGGERED)).toBe(false);
      expect(isValidTransition(ReminderStatus.DRAFT, ReminderStatus.ARRIVAL_PENDING)).toBe(false);
      expect(isValidTransition(ReminderStatus.TRIGGERED, ReminderStatus.ARMED)).toBe(false);
      expect(isValidTransition(ReminderStatus.TRIGGERED, ReminderStatus.CANCELLED)).toBe(false);
      expect(isValidTransition(ReminderStatus.COMPLETED, ReminderStatus.ARMED)).toBe(false);
      expect(isValidTransition(ReminderStatus.COMPLETED, ReminderStatus.WAITING_FOR_EXIT)).toBe(false);
      expect(isValidTransition(ReminderStatus.COMPLETED, ReminderStatus.TRIGGERED)).toBe(false);
      expect(isValidTransition(ReminderStatus.CANCELLED, ReminderStatus.ARMED)).toBe(false);
      expect(isValidTransition(ReminderStatus.PAUSED, ReminderStatus.ARRIVAL_PENDING)).toBe(false);
    });

    it('returns false for same-state transitions', () => {
      for (const status of Object.values(ReminderStatus)) {
        expect(isValidTransition(status, status)).toBe(false);
      }
    });
  });

  describe('validateTransition', () => {
    it('returns the destination state for valid transitions', () => {
      expect(validateTransition(ReminderStatus.DRAFT, ReminderStatus.ARMED)).toBe(
        ReminderStatus.ARMED,
      );
      expect(validateTransition(ReminderStatus.ARMED, ReminderStatus.TRIGGERED)).toBe(
        ReminderStatus.TRIGGERED,
      );
    });

    it('throws for invalid transitions', () => {
      expect(() => validateTransition(ReminderStatus.DRAFT, ReminderStatus.TRIGGERED)).toThrow(
        'Invalid state transition: DRAFT → TRIGGERED',
      );
      expect(() => validateTransition(ReminderStatus.TRIGGERED, ReminderStatus.ARMED)).toThrow(
        'Invalid state transition: TRIGGERED → ARMED',
      );
    });

    it('includes allowed transitions in the error message', () => {
      try {
        validateTransition(ReminderStatus.DRAFT, ReminderStatus.TRIGGERED);
        fail('Should have thrown');
      } catch (e) {
        expect((e as Error).message).toContain('DRAFT → TRIGGERED');
        expect((e as Error).message).toContain('ARMED');
      }
    });
  });
});
