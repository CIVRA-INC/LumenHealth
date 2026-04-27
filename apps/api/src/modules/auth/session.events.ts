import { EventEmitter } from "events";

export type SessionEventType = "session.created" | "session.refreshed" | "session.revoked";

export interface SessionEventPayload {
  eventId: string;
  type: SessionEventType;
  userId: string;
  clinicId: string;
  issuedAt: number;
  /** Idempotency key – duplicate delivery with same eventId is a no-op */
  idempotencyKey: string;
}

const bus = new EventEmitter();
bus.setMaxListeners(20);

const processed = new Set<string>();

/** Emit a session domain event. Duplicate eventIds are silently dropped. */
export function emitSessionEvent(payload: SessionEventPayload): void {
  if (processed.has(payload.idempotencyKey)) return;
  processed.add(payload.idempotencyKey);
  bus.emit(payload.type, payload);
}

/** Register a handler for a session event type. */
export function onSessionEvent(
  type: SessionEventType,
  handler: (payload: SessionEventPayload) => void | Promise<void>,
): void {
  bus.on(type, (payload: SessionEventPayload) => {
    Promise.resolve(handler(payload)).catch((err: unknown) => {
      console.error(`[session-events] handler error for ${type}:`, err);
    });
  });
}

/** Build a deterministic idempotency key from userId + issuedAt. */
export function sessionIdempotencyKey(userId: string, issuedAt: number): string {
  return `${userId}:${issuedAt}`;
}

// Default handler: log session creation for audit trail
onSessionEvent("session.created", (p) => {
  console.info(`[session] created  user=${p.userId} clinic=${p.clinicId} at=${p.issuedAt}`);
});

onSessionEvent("session.revoked", (p) => {
  console.info(`[session] revoked  user=${p.userId} key=${p.idempotencyKey}`);
});
