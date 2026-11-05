# Plan 2: Reminder Domain & Local Data

## Feature Name
Reminder Models, State Machine, and Local Persistence

## Goal
Implement reminder domain models, lifecycle state machine, SQLite repository, and deterministic business-logic tests. No UI yet — pure domain layer.

## Architecture
- Pure TypeScript models (no React dependencies)
- State machine with explicit transitions and guards
- Repository pattern: interface in `src/services/`, implementation in `src/data/`
- SQLite for persistence with migration support

## Tech Stack
| Layer | Choice |
|---|---|
| Models | Pure TypeScript (no framework deps) |
| State Machine | Manual FSM with transition table |
| Storage | react-native-sqlite-storage v7 |
| State Management | Zustand store (read from repository) |
| Testing | Vitest + in-memory SQLite for tests |

## Spec References
- §3.1 Reminder creation: title, description, lat/lng, locationName, radius, source, timestamps
- §3.3 Entry-only behavior: WAITING_FOR_EXIT vs ARMED determination
- §3.4 Reminder lifecycle: DRAFT, WAITING_FOR_EXIT, ARMED, TRIGGERED, COMPLETED, CANCELLED
- §3.5 Reminder management: CRUD operations
- §9 Data model: Reminder, ReminderEvent, NotificationDeliveryRecord
- §10 Quality: state transition tests (items 1-12)

## Global Constraints
- All models use UUID for `id` (import `uuid` or `react-native-uuid`)
- Status is a strict enum — no string magic
- State transitions are deterministic and fully tested
- SQLite schema supports all reminder fields + event records
- No network calls in domain layer
- Repository interface abstracts storage — swap implementation if needed

## Review Focus
- All 6 lifecycle states defined and tested
- State transitions match spec §3.4 exactly
- Inside/outside determination at creation time works correctly (§3.3)
- SQLite schema persists all required fields
- Business-logic tests pass for scenarios 1-12 from spec §10

## Files to Create

```
src/models/
  Reminder.ts              — Reminder entity interface + factory
  ReminderStatus.ts        — Status enum
  LocationSource.ts        — Location source enum
  ReminderEvent.ts         — Diagnostic event record interface
  NotificationDeliveryRecord.ts — Notification delivery log interface

src/services/
  StateMachine.ts          — State transition logic + inside/outside check
  GeofenceOrchestration.ts — (stub) registration interface definition
  ReminderRepository.ts    — Repository interface (port)

src/data/
  SQLiteAdapter.ts         — SQLite schema, CRUD operations
  ReminderRepositoryImpl.ts — Repository interface implementation

src/stores/
  reminderStore.ts         — Zustand store: CRUD operations, state machine integration

src/__tests__/
  models/
    Reminder.test.ts       — Model validation, factory function
  services/
    StateMachine.test.ts   — All state transitions, inside/outside determination
    ReminderRepository.test.ts — In-memory repo tests (CRUD operations)
  stores/
    reminderStore.test.ts  — Store actions, state machine integration
```

## Interfaces

### Models (`src/models/`)

```typescript
// ReminderStatus.ts
export enum ReminderStatus {
  DRAFT = 'DRAFT',
  WAITING_FOR_EXIT = 'WAITING_FOR_EXIT',
  ARMED = 'ARMED',
  TRIGGERED = 'TRIGGERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// LocationSource.ts
export enum LocationSource {
  CURRENT_GPS = 'current_gps',
  MAP_PIN = 'map_pin',
  PLACE_SEARCH = 'place_search',
}

// Reminder.ts
export interface Reminder {
  id: string; // UUID
  title: string;
  description: string | null;
  latitude: number;
  longitude: number;
  locationName: string | null;
  radiusMeters: number;
  locationSource: LocationSource;
  status: ReminderStatus;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  triggeredAt: string | null; // ISO 8601 or null
  completedAt: string | null; // ISO 8601 or null
  notificationSoundEnabled: boolean;
  notificationVibrationEnabled: boolean;
}

export function createReminder(overrides: Partial<Reminder>): Reminder;
export function updateReminder(existing: Reminder, changes: Partial<Pick<Reminder, 'title' | 'description' | 'latitude' | 'longitude' | 'locationName' | 'radiusMeters' | 'notificationSoundEnabled' | 'notificationVibrationEnabled'>>): Reminder;

// ReminderEvent.ts
export interface ReminderEvent {
  id: string; // UUID
  reminderId: string;
  eventType: 'CREATED' | 'STATUS_CHANGED' | 'TRIGGERED' | 'COMPLETED' | 'CANCELLED' | 'EDITED';
  timestamp: string; // ISO 8601
  previousStatus: ReminderStatus | null;
  newStatus: ReminderStatus | null;
  outcome: 'SUCCESS' | 'FAILED' | 'PENDING';
  details?: Record<string, unknown>;
}

// NotificationDeliveryRecord.ts
export interface NotificationDeliveryRecord {
  id: string; // UUID
  reminderId: string;
  notificationId: string; // OS-assigned notification ID
  scheduledAt: string; // ISO 8601
  deliveredAt: string | null; // ISO 8601 or null (OS may not provide)
  status: 'SCHEDULED' | 'DELIVERED' | 'FAILED';
  failureReason: string | null;
}
```

### State Machine (`src/services/StateMachine.ts`)

```typescript
export type ValidTransitions = Record<ReminderStatus, ReminderStatus[]>;

export function canTransition(from: ReminderStatus, to: ReminderStatus): boolean;
export function determineInitialStatus(currentLat: number, currentLng: number, targetLat: number, targetLng: number, radiusMeters: number): ReminderStatus;
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
```

**Transition table (spec §3.4):**

| From | Valid Next States |
|---|---|
| DRAFT | ARMED, WAITING_FOR_EXIT, COMPLETED, CANCELLED |
| WAITING_FOR_EXIT | ARMED (on exit), CANCELLED |
| ARMED | TRIGGERED (on entry), COMPLETED (manual), CANCELLED |
| TRIGGERED | COMPLETED (manual) |
| COMPLETED | — (terminal) |
| CANCELLED | — (terminal) |

**Inside/outside determination:** `determineInitialStatus()` uses haversine distance. If distance ≤ radius → `WAITING_FOR_EXIT`. If distance > radius → `ARMED`. If location unavailable → return `DRAFT` with error flag.

### Repository Interface (`src/services/ReminderRepository.ts`)

```typescript
export interface ReminderRepository {
  getById(id: string): Promise<Reminder | null>;
  getAll(): Promise<Reminder[]>;
  getActive(): Promise<Reminder[]>; // ARMED, WAITING_FOR_EXIT
  create(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reminder>;
  update(id: string, changes: Partial<Reminder>): Promise<Reminder | null>;
  delete(id: string): Promise<boolean>;
  getByStatus(status: ReminderStatus): Promise<Reminder[]>;
}

export interface EventRepository {
  create(event: Omit<ReminderEvent, 'id'>): Promise<ReminderEvent>;
  getByReminderId(reminderId: string): Promise<ReminderEvent[]>;
}

export interface NotificationLogRepository {
  create(record: Omit<NotificationDeliveryRecord, 'id'>): Promise<NotificationDeliveryRecord>;
  getById(id: string): Promise<NotificationDeliveryRecord | null>;
  getByReminderId(reminderId: string): Promise<NotificationDeliveryRecord[]>;
}
```

### Zustand Store (`src/stores/reminderStore.ts`)

```typescript
interface ReminderState {
  reminders: Reminder[];
  loading: boolean;
  error: string | null;
  loadAll: () => Promise<void>;
  createReminder: (data: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Reminder>;
  updateReminder: (id: string, changes: Partial<Reminder>) => Promise<Reminder | null>;
  deleteReminder: (id: string) => Promise<boolean>;
  transitionStatus: (id: string, newStatus: ReminderStatus) => Promise<Reminder | null>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({...}));
```

## Tasks (Checkbox — Test-First)

- [ ] **Step 2.1:** Define all models (Reminder, ReminderStatus, LocationSource, ReminderEvent, NotificationDeliveryRecord)
  - Create `src/models/Reminder.ts`, `src/models/ReminderStatus.ts`, etc.
  - Test: `src/__tests__/models/Reminder.test.ts` — factory creates valid reminder, validation rejects invalid (negative radius, out-of-range lat/lng)
  - Expected: Factory function works, validation catches edge cases

- [ ] **Step 2.2:** Implement state machine (transitions + inside/outside check)
  - Create `src/services/StateMachine.ts`
  - Implement haversine distance calculation
  - Implement `determineInitialStatus()` — returns WAITING_FOR_EXIT if inside, ARMED if outside, DRAFT if location unavailable
  - Test: `src/__tests__/services/StateMachine.test.ts` — all transitions from spec §10 items 1-7
  - Expected: All 21 acceptance criteria scenarios pass (items 1-12 from spec §10)

- [ ] **Step 2.3:** Define repository interfaces
  - Create `src/services/ReminderRepository.ts`, `EventRepository.ts`, `NotificationLogRepository.ts`
  - Test: Interface definitions compile, all methods typed correctly
  - Expected: TypeScript compilation passes

- [ ] **Step 2.4:** Implement SQLite schema and adapter
  - Create `src/data/SQLiteAdapter.ts` with tables: `reminders`, `reminder_events`, `notification_delivery_records`
  - Schema migration from v1 to current version
  - Test: Database opens, tables created, schema matches spec §9 fields
  - Expected: SQLite operations succeed on both iOS and Android simulators

- [ ] **Step 2.5:** Implement repository implementations
  - Create `src/data/ReminderRepositoryImpl.ts`, etc.
  - Test: CRUD operations persist and retrieve correctly, transactions rollback on failure
  - Expected: All CRUD operations work, transaction boundaries correct

- [ ] **Step 2.6:** Implement Zustand store
  - Create `src/stores/reminderStore.ts` — connects to repository, exposes state machine transitions
  - Test: `src/__tests__/stores/reminderStore.test.ts` — create reminder sets correct initial status, transitionStatus validates transitions
  - Expected: Store actions work, state updates propagate correctly

- [ ] **Step 2.7:** Run all spec §10 scenario tests (items 1-12)
  - Test file: `src/__tests__/services/StateMachine.test.ts` covers:
    1. Inside target → WAITING_FOR_EXIT
    2. Initial registration while inside does not trigger
    3. Confirmed exit → ARMED
    4. Next entry triggers exactly once
    5. Outside target → ARMED
    6. Enter radius → trigger exactly once
    7. Repeated entry events don't duplicate alerts
    8. Exit alone never triggers
    9. Two reminders same coordinates handled independently
    10. Edit location/radius updates state and registration
    11. Cancel/delete removes registration
    12. Restart restores reminder state and eligible geofences (state restoration test)
  - Expected: All 12 scenarios pass

- [ ] **Step 2.8:** Create commit
  - Command: `git add . && git commit -m "feat: reminder domain — models, state machine, SQLite persistence, Zustand store"`
  - Expected: Clean commit at revision `v2-domain`

## Verification Commands

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npx eslint src/models/ src/services/ src/data/ src/stores/

# Domain tests (critical)
npx vitest run src/__tests__/services/StateMachine.test.ts

# Full test suite
npx vitest run
```

## Drift-Check Command

```bash
git diff v2-domain..HEAD -- src/models/ src/services/ src/data/ src/stores/
```
