/**
 * Durable event queue for simulation LMS events (WEB-DEVELOPER-GUIDE.md §9:
 * "Once a browser event has been received, the LMS can queue it reliably").
 * Generic across simulations — not specific to any one project.
 *
 * Persists every received payload to IndexedDB immediately, in emission
 * order, before any network attempt is made. A failed delivery leaves the
 * row pending for the next flush tick; nothing is ever dropped on failure.
 * Rows are keyed by eventId, so re-enqueuing an event already delivered is a
 * harmless overwrite (put, not add).
 */

import { postEventsBatch, type SimulationEventPayload, type EventIngestResult } from './experiments';

const DB_NAME = 'simulation-lms-queue';
// v2: replaced the byEnqueuedAt index (Date.now(), millisecond resolution —
// ties on same-millisecond events sorted by random eventId, scrambling
// delivery order) with bySequence (a strictly increasing counter, see
// nextSequence()). Bumping the version is required for browsers that already
// opened the v1 schema to actually pick up the new index — onupgradeneeded
// only runs on a version increase.
const DB_VERSION = 2;
const STORE_NAME = 'events';
const FLUSH_BATCH_SIZE = 25;

interface QueuedEvent {
  eventId: string;
  payload: SimulationEventPayload;
  enqueuedAt: number;
  /** Strict FIFO ordering key — see nextSequence(). Never derived from Date.now() alone. */
  sequence: number;
  status: 'pending' | 'delivered';
  retryCount: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? req.transaction!.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'eventId' });
      if (store.indexNames.contains('byEnqueuedAt')) store.deleteIndex('byEnqueuedAt');
      if (!store.indexNames.contains('bySequence')) store.createIndex('bySequence', 'sequence');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// A Unity scene can fire several events (e.g. SessionStarted, ExperimentStarted,
// StepStarted) within the same millisecond — Date.now() alone is not fine-
// grained enough to order them, and ties on a non-unique IndexedDB index sort
// by primary key (a random eventId), not arrival order. That silently
// scrambled delivery order in practice: ExperimentStarted was observed
// reaching the backend before the SessionStarted it depends on, and every
// event after it then failed a foreign-key check it could never recover
// from. This counter guarantees a strictly increasing key regardless of how
// many events land in the same millisecond, while still growing with real
// time (so ordering across page reloads, which reset the sub-counter, stays
// correct — a reload only ever happens later in wall-clock time).
let lastMs = 0;
let subMsCounter = 0;
function nextSequence(): number {
  const now = Date.now();
  if (now === lastMs) {
    subMsCounter += 1;
  } else {
    lastMs = now;
    subMsCounter = 0;
  }
  return now * 1000 + subMsCounter;
}

/** Persists one event immediately — call this the moment the bridge listener receives it. */
export async function enqueue(payload: SimulationEventPayload): Promise<void> {
  const record: QueuedEvent = {
    eventId: payload.eventId,
    payload,
    enqueuedAt: Date.now(),
    sequence: nextSequence(),
    status: 'pending',
    retryCount: 0,
  };
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

async function getPending(limit: number): Promise<QueuedEvent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('bySequence');
    const results: QueuedEvent[] = [];
    const req = index.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor || results.length >= limit) {
        resolve(results);
        return;
      }
      const record = cursor.value as QueuedEvent;
      if (record.status === 'pending') results.push(record);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

async function markSettled(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of eventIds) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as QueuedEvent | undefined;
        if (record) {
          record.status = 'delivered';
          store.put(record);
        }
      };
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

async function bumpRetry(eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of eventIds) {
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const record = getReq.result as QueuedEvent | undefined;
        if (record) {
          record.retryCount += 1;
          store.put(record);
        }
      };
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

/** Housekeeping — prunes delivered rows older than the given age. Call occasionally (e.g. on experiment exit), never required for correctness. */
export async function pruneDelivered(olderThanMs = 24 * 60 * 60 * 1000): Promise<void> {
  const db = await openDb();
  const cutoff = Date.now() - olderThanMs;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const record = cursor.value as QueuedEvent;
      if (record.status === 'delivered' && record.enqueuedAt < cutoff) cursor.delete();
      cursor.continue();
    };
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => reject(tx.error);
  });
}

let flushing = false;

/**
 * Sends pending events to the backend in FIFO order. Safe to call
 * repeatedly/concurrently — a flush already in progress is skipped, the
 * next timer tick picks up anything left over. A network failure leaves
 * every row in the batch pending for retry with its original eventId
 * (guide §9/§6 step 6). A 'rejected' result (a genuine validation failure,
 * not a transient error) is also marked settled — retrying it can never
 * succeed without the payload itself changing.
 */
export async function flush(): Promise<{ delivered: number; pending: number }> {
  if (flushing) return { delivered: 0, pending: 0 };
  flushing = true;
  try {
    const batch = await getPending(FLUSH_BATCH_SIZE);
    if (batch.length === 0) return { delivered: 0, pending: 0 };

    let results: EventIngestResult[];
    try {
      results = await postEventsBatch(batch.map((b) => b.payload));
    } catch {
      await bumpRetry(batch.map((b) => b.eventId));
      return { delivered: 0, pending: batch.length };
    }

    const settledIds = results
      .filter((r) => r.status === 'stored' || r.status === 'duplicate' || r.status === 'rejected')
      .map((r) => r.eventId)
      .filter((id): id is string => Boolean(id));

    await markSettled(settledIds);
    return { delivered: settledIds.length, pending: batch.length - settledIds.length };
  } finally {
    flushing = false;
  }
}

/** Starts a periodic flush loop; call the returned function to stop it (e.g. on unmount). */
export function startFlushLoop(intervalMs = 5000): () => void {
  const id = setInterval(() => { void flush(); }, intervalMs);
  return () => clearInterval(id);
}
