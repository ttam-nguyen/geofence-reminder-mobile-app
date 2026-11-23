// Logger — durable, low-overhead event log for core app behaviour.
//
// Why: geofencing work happens while the app is backgrounded or dead. `console.log` output is
// gone by the time the user notices a missing notification, so every meaningful step is also
// written to SQLite and can be exported from Settings > Diagnostics.
//
// Design notes:
// - `logEvent()` never throws and never blocks: entries go to an in-memory queue that a timer
//   flushes in batches. A failure to persist must not break geofencing.
// - Console output is kept so `adb logcat` still works.

import {
  deleteAllLogs,
  findRecentLogs,
  insertLogs,
  purgeOldLogs,
  trimLogs,
  type LogEntry,
  type LogLevel,
  type LogRecord,
  MAX_DATA_CHARS,
} from '../models/logRepository';
import { AppState } from 'react-native';

/** How often the queue is persisted. */
const FLUSH_INTERVAL_MS = 2000;
/** Flush immediately once the queue reaches this size. */
const MAX_QUEUE_SIZE = 50;

const queue: LogRecord[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;
let initialized = false;
let flushInFlight = false;

function stringifyData(data: unknown): string | null {
  if (data === undefined || data === null) return null;

  try {
    const json = typeof data === 'string' ? data : JSON.stringify(data);
    return json.length > MAX_DATA_CHARS ? `${json.slice(0, MAX_DATA_CHARS)}…` : json;
  } catch {
    return '[unserialisable]';
  }
}

function push(record: LogRecord): void {
  queue.push(record);
  if (queue.length >= MAX_QUEUE_SIZE) {
    void flushLogs();
  }
}

/** Persist everything queued. Safe to call at any time. */
export async function flushLogs(): Promise<void> {
  if (flushInFlight || queue.length === 0) return;

  flushInFlight = true;
  const batch = queue.splice(0, queue.length);

  try {
    await insertLogs(batch);
  } catch (error) {
    // Dropping the batch beats crashing the feature that is being logged.
    console.warn('[Logger] Failed to persist log batch:', error);
  } finally {
    flushInFlight = false;
  }
}

/**
 * Create the log table, purge old rows, and start the flush timer.
 * Call once at app startup.
 */
export async function initLogger(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    // Force schema creation + housekeeping before the first write.
    await flushLogs();
    await purgeOldLogs();
    await trimLogs();
  } catch (error) {
    console.warn('[Logger] Initialisation failed:', error);
  }

  if (flushTimer === null) {
    flushTimer = setInterval(() => {
      void flushLogs();
    }, FLUSH_INTERVAL_MS);
    // React Native returns a numeric id; Node (Jest) returns a Timeout. Unref where possible so
    // the timer never keeps the test process alive.
    (flushTimer as unknown as { unref?: () => void }).unref?.();
  }

  // The OS may suspend or kill the process while backgrounded — flush first so the trailing
  // events survive.
  try {
    AppState.addEventListener('change', state => {
      if (state !== 'active') {
        void flushLogs();
      }
    });
  } catch {
    // AppState unavailable (unit tests) — the interval still covers persistence.
  }

  logEvent('info', 'app', 'Logger initialised');
}

/** Record one event. Never throws. */
export function logEvent(level: LogLevel, tag: string, message: string, data?: unknown): void {
  const record: LogRecord = {
    at: new Date().toISOString(),
    level,
    tag,
    message,
    data: stringifyData(data),
  };

  const consoleFn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleFn(`[${tag}] ${message}`, data ?? '');

  if (!initialized) {
    // Before init, keep entries in memory so early startup events are not lost.
    push(record);
    return;
  }

  push(record);
}

export const log = {
  debug: (tag: string, message: string, data?: unknown) => logEvent('debug', tag, message, data),
  info: (tag: string, message: string, data?: unknown) => logEvent('info', tag, message, data),
  warn: (tag: string, message: string, data?: unknown) => logEvent('warn', tag, message, data),
  error: (tag: string, message: string, data?: unknown) => logEvent('error', tag, message, data),
};

function formatEntry(entry: LogEntry): string {
  const data = entry.data ? ` ${entry.data}` : '';
  return `${entry.at} ${entry.level.toUpperCase().padEnd(5)} [${entry.tag}] ${entry.message}${data}`;
}

/** Plain-text dump for export / sharing. Chronological, oldest first. */
export async function exportLogs(limit = 2000): Promise<string> {
  await flushLogs();
  const entries = await findRecentLogs(limit, true);

  const header = [
    'GPS Reminder — diagnostics log',
    `exported: ${new Date().toISOString()}`,
    `entries: ${entries.length}`,
    '',
  ].join('\n');

  return `${header}${entries.map(formatEntry).join('\n')}`;
}

/** Delete every stored entry. */
export async function clearLogs(): Promise<void> {
  queue.length = 0;
  await deleteAllLogs();
  logEvent('info', 'app', 'Logs cleared by user');
}

/** Stop the flush timer (tests). */
export function stopLogger(): void {
  if (flushTimer !== null) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  initialized = false;
}
