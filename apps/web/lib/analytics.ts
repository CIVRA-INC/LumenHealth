type EventName =
  | "discovery_impression"
  | "session_join"
  | "tip_attempt"
  | "tip_success"
  | "tip_failure"
  | "onboarding_step";

interface EventPayload {
  userId?: string;
  artistId?: string;
  sessionId?: string;
  step?: string;
  amount?: number;
  [key: string]: unknown;
}

const queue: Array<{ event: EventName; payload: EventPayload; ts: number }> = [];
let flushing = false;

async function flush() {
  if (flushing || queue.length === 0) return;
  flushing = true;
  const batch = queue.splice(0, queue.length);
  try {
    await fetch("/api/v1/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    });
  } catch {
    // non-blocking — analytics must never break the app
  } finally {
    flushing = false;
  }
}

/**
 * Track a typed product event. Batches and flushes asynchronously.
 */
export function track(event: EventName, payload: EventPayload = {}) {
  queue.push({ event, payload, ts: Date.now() });
  // Debounce flush to batch rapid events
  setTimeout(flush, 300);
}

// Convenience hooks
export const analytics = {
  discoveryImpression: (artistId: string) => track("discovery_impression", { artistId }),
  sessionJoin: (sessionId: string, userId?: string) => track("session_join", { sessionId, userId }),
  tipAttempt: (artistId: string, amount: number) => track("tip_attempt", { artistId, amount }),
  onboardingStep: (step: string) => track("onboarding_step", { step }),
};
