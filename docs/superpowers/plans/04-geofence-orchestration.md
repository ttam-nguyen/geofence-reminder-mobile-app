# Plan 4: Geofence Orchestration & Integration

## Feature Name
Geofence Registration Manager — State Machine + Native Geofencing Integration

## Goal
Connect the reminder state machine (Plan 2) with native geofencing (Plan 3). Implement registration manager, capacity policy, inside/outside initialization, exit-to-arm, entry-to-trigger, idempotency, and recovery.

## Architecture
- Registration manager: maps reminder IDs to native geofence IDs
- Capacity policy: when limit exceeded, prioritize active reminders (ARMED > WAITING_FOR_EXIT)
- Event reconciler: processes native geofence events, updates reminder state via state machine
- Idempotency: triggered reminders marked once, duplicate OS events ignored
- Recovery: on app restart, re-register all eligible geofences based on persisted state

## Tech Stack
| Layer | Choice |
|---|---|
| Orchestration | Zustand store (extends reminderStore) + service class |
| State Machine | From Plan 2: `StateMachine.canTransition()`, `determineInitialStatus()` |
| Native Bridge | From Plan 3: `GeofencingModule`, `useGeofencing()` hook |
| Persistence | From Plan 2: SQLite repository |

## Spec References
- §3.3 Entry-only behavior: WAITING_FOR_EXIT vs ARMED, no trigger on initial registration
- §3.4 Reminder lifecycle: triggered reminders unregistered, state survives restart, editing recalculates state
- §5 Background constraints: swipe-away, force-stop, reboot behavior (document limitations)
- §5 Geofence limits: iOS 20, Android 500 — prioritization policy required
- §10 Quality: scenarios 4, 7, 9, 10, 11, 12 (idempotency, multiple reminders, edit, cancel, restart)

## Global Constraints
- iOS limit: 20 regions per app. Android limit: 500 geofences.
- When limit exceeded, drop lowest-priority reminders (ARMED > WAITING_FOR_EXIT > DRAFT)
- A triggered reminder must be unregistered from native geofencing immediately
- State transitions are atomic: update DB + update native registration in same transaction
- Duplicate OS events (common on Android) produce exactly one notification
- Device restart: re-register eligible reminders from persisted state
- No geofence registration for COMPLETED or CANCELLED reminders

## Review Focus
- Capacity policy drops correct reminders when limit exceeded (test with 25 iOS regions, 550 Android geofences)
- Inside/outside check at creation time sets correct initial status and registers correctly
- Exit from WAITING_FOR_EXIT transitions to ARMED and re-registers geofence
- Entry into ARMED triggers exactly once, marks TRIGGERED, unregisters native geofence
- Duplicate entry events don't produce duplicate notifications (idempotency)
- Edit location/radius recalculates status and re-registers correctly
- Cancel/delete unregisters native geofence
- App restart restores all eligible geofences from persisted state

## Files to Create

```
src/services/
  RegistrationManager.ts     — Maps reminders ↔ native geofences, capacity policy

src/stores/
  orchestrationStore.ts      — Zustand store: registration lifecycle, event processing

src/native/
  GeofenceEventProcessor.ts  — Processes native events, updates reminder state

src/__tests__/
  services/
    RegistrationManager.test.ts — Capacity policy, register/unregister logic
  stores/
    orchestrationStore.test.ts — Event processing, state transitions, idempotency
```

## Interfaces

### Registration Manager (`src/services/RegistrationManager.ts`)

```typescript
export interface GeofenceRegistration {
  reminderId: string;
  registeredAt: number; // epoch ms
  status: ReminderStatus;
}

export class RegistrationManager {
  constructor(
    private repository: ReminderRepository,
    private geofencingModule: GeofencingModule,
  ) {}

  // Register all eligible reminders as native geofences
  registerAll(): Promise<void>;
  
  // Register a single reminder, re-register if status changed
  registerReminder(reminder: Reminder): Promise<void>;
  
  // Unregister a single reminder's native geofence
  unregisterReminder(reminderId: string): Promise<void>;
  
  // Capacity policy: if over limit, drop lowest priority reminders
  enforceCapacity(): Promise<string[]>; // returns dropped reminder IDs
  
  // Get current count of registered geofences
  getRegistrationCount(): Promise<number>;
  
  // Get all registered reminder IDs
  getRegisteredReminderIds(): Promise<string[]>;
}

// Capacity prioritization:
// Priority order (highest to lowest): ARMED > WAITING_FOR_EXIT > DRAFT
// iOS limit: 20, Android limit: 500
const IOS_LIMIT = 20;
const ANDROID_LIMIT = 500;
const PRIORITY: Record<ReminderStatus, number> = {
  ARMED: 3,
  WAITING_FOR_EXIT: 2,
  DRAFT: 1,
  TRIGGERED: 0, // should not be registered
  COMPLETED: 0,
  CANCELLED: 0,
};
```

### Event Processor (`src/native/GeofenceEventProcessor.ts`)

```typescript
export class GeofenceEventProcessor {
  constructor(
    private repository: ReminderRepository,
    private stateMachine: StateMachine,
  ) {}

  // Process a native geofence event (ENTER or EXIT)
  processEvent(event: GeofenceEvent): Promise<void>;

  // Idempotency check: has this reminder already been triggered?
  private isAlreadyTriggered(reminderId: string): Promise<boolean>;

  // Transition reminder based on event type
  private handleEnterEvent(reminderId: string): Promise<void>;
  private handleExitEvent(reminderId: string): Promise<void>;
}

// State machine transitions on event:
// WAITING_FOR_EXIT + EXIT → ARMED (re-register geofence)
// ARMED + ENTER → TRIGGERED (fire notification, unregister geofence, mark triggeredAt)
// ARMED + EXIT → no transition (exit-only reminders don't trigger on exit)
```

### Orchestration Store (`src/stores/orchestrationStore.ts`)

```typescript
interface OrchestrationState {
  registeredReminderIds: string[];
  lastEventLog: GeofenceEvent | null;
  registerAll: () => Promise<void>;
  processEvent: (event: GeofenceEvent) => Promise<void>;
  handleTriggeredReminder: (reminderId: string) => Promise<void>; // mark TRIGGERED, unregister
  handleCompletedReminder: (reminderId: string) => Promise<void>; // mark COMPLETED, unregister
}

export const useOrchestrationStore = create<OrchestrationState>((set, get) => ({...}));
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 4.1:** Implement RegistrationManager (register, unregister, capacity policy)
  - Create `src/services/RegistrationManager.ts`
  - Test: `src/__tests__/services/RegistrationManager.test.ts` — register N reminders, enforce capacity when over limit (drop lowest priority), verify dropped IDs
  - Expected: Capacity policy drops correct reminders, register/unregister work

- [ ] **Step 4.2:** Implement GeofenceEventProcessor (event → state transition)
  - Create `src/native/GeofenceEventProcessor.ts`
  - Test: `src/__tests__/stores/orchestrationStore.test.ts` — process ENTER event for WAITING_FOR_EXIT reminder (no transition), EXIT event transitions to ARMED, ENTER event for ARMED transitions to TRIGGERED
  - Expected: State transitions match spec §3.3, §3.4

- [ ] **Step 4.3:** Implement idempotency (duplicate event handling)
  - Test: process same ENTER event twice for same ARMED reminder → TRIGGERED only once
  - Test: process EXIT event after TRIGGERED → no state change (terminal state)
  - Expected: Exactly one notification per reminder, duplicate events ignored

- [ ] **Step 4.4:** Implement capacity policy tests (spec §10 items 9, 19)
  - Test: 25 reminders registered on iOS (limit 20) → 5 lowest priority dropped
  - Test: 550 reminders on Android (limit 500) → 50 lowest priority dropped
  - Test: two reminders same coordinates handled independently (both registered if both eligible)
  - Expected: Correct reminders dropped, independent handling verified

- [ ] **Step 4.5:** Implement edit/recalculation flow
  - Test: edit reminder location → re-determine status → re-register with new coordinates/radius
  - Test: edit radius → update geofence registration (different radius)
  - Expected: State recalculated, native geofence updated

- [ ] **Step 4.6:** Implement cancel/delete flow
  - Test: cancel reminder → transition to CANCELLED → unregister native geofence
  - Test: delete reminder → remove from DB + unregister native geofence
  - Expected: Native geofence removed, no orphaned registrations

- [ ] **Step 4.7:** Implement restart recovery
  - Test: persist reminders in WAITING_FOR_EXIT and ARMED states → restart app → re-register all eligible
  - Test: TRIGGERED/COMPLETED/CANCELLED reminders not re-registered
  - Expected: Eligible geofences restored, terminal-state reminders skipped

- [ ] **Step 4.8:** Create commit
  - Command: `git add . && git commit -m "feat: geofence orchestration — registration manager, capacity policy, event processing, idempotency, restart recovery"`
  - Expected: Clean commit at revision `v4-orchestration`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/services/RegistrationManager.ts src/native/GeofenceEventProcessor.ts src/stores/orchestrationStore.ts

# Unit tests (critical)
npx vitest run src/__tests__/services/RegistrationManager.test.ts src/__tests__/stores/orchestrationStore.test.ts

# Integration test (real device)
npx react-native run-ios --simulator "iPhone 14"  # or physical device
npx react-native run-android --variant=debug        # or physical device
# Manual: Create reminder inside radius → WAITING_FOR_EXIT → walk out → ARMED → walk in → TRIGGERED (one notification)
```

## Drift-Check Command

```bash
git diff v4-orchestration..HEAD -- src/services/RegistrationManager.ts src/native/GeofenceEventProcessor.ts src/stores/orchestrationStore.ts
```
