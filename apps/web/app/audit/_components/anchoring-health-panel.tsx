"use client";

import { useCallback, useEffect, useState } from "react";
import type { AnchoringHealthReport } from "@lumen/types";
import { useAuthSession } from "../../auth/session-provider";
import { fetchAnchoringHealth } from "../api";
import { formatDuration, formatRelativeTime } from "./format-time";

type Status = "loading" | "idle" | "error" | "not-configured";

/** Relative times ("5m ago") are recomputed this often so a long-lived dashboard does not go stale. */
const RELATIVE_TIME_TICK_MS = 60_000;

/** Above this, the pipeline reads as degraded even without an explicit alert — mirrors the scheduler's own default stale threshold. */
const LAG_WARNING_THRESHOLD_MS = 15 * 60_000;
/** Mirrors the scheduler's default `maxConsecutiveFailures`. */
const FAILURE_WARNING_THRESHOLD = 3;

function isDegraded(health: AnchoringHealthReport): boolean {
  return (
    health.consecutiveFailureCount >= FAILURE_WARNING_THRESHOLD ||
    (health.oldestUnanchoredAgeMs ?? 0) >= LAG_WARNING_THRESHOLD_MS
  );
}

export function AnchoringHealthPanel() {
  const { session } = useAuthSession();
  const [health, setHealth] = useState<AnchoringHealthReport | null>(null);
  const [status, setStatus] = useState<Status>(session ? "loading" : "idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const canView = session?.role === "owner" || session?.role === "admin";

  const load = useCallback(() => {
    if (!session || !canView) return;
    setStatus("loading");
    setErrorMessage("");

    fetchAnchoringHealth(session.accessToken)
      .then((report) => {
        setHealth(report);
        setStatus("idle");
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Failed to load anchoring health";
        if (message.includes("501") || message.includes("NOT_CONFIGURED")) {
          setStatus("not-configured");
          return;
        }
        setErrorMessage(message);
        setStatus("error");
      });
  }, [session, canView]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, canView]);

  if (!canView) return null;

  if (status === "not-configured") {
    return (
      <section className="healthPanel">
        <h2>Anchoring pipeline health</h2>
        <p className="muted">
          The running stellar-service process doesn&rsquo;t run the anchoring scheduler, so there&rsquo;s no
          health to report here.
        </p>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="healthPanel">
        <h2>Anchoring pipeline health</h2>
        <p className="formError" role="alert">
          {errorMessage}
        </p>
        <button type="button" onClick={load}>
          Retry
        </button>
      </section>
    );
  }

  if (status === "loading" || !health) {
    return (
      <section className="healthPanel">
        <h2>Anchoring pipeline health</h2>
        <p role="status">Checking&hellip;</p>
      </section>
    );
  }

  const degraded = isDegraded(health);

  return (
    <section className={`healthPanel ${degraded ? "healthPanel--degraded" : "healthPanel--healthy"}`}>
      <div className="healthPanelHeader">
        <h2>Anchoring pipeline health</h2>
        <span className={`healthStatusBadge ${degraded ? "healthStatusBadge--degraded" : "healthStatusBadge--healthy"}`}>
          {degraded ? "Degraded" : "Healthy"}
        </span>
      </div>

      <dl className="healthSummary">
        <div>
          <dt>Last successful check</dt>
          <dd>{formatRelativeTime(health.lastSuccessfulTickAt, now)}</dd>
        </div>
        <div>
          <dt>Last anchor</dt>
          <dd>{formatRelativeTime(health.lastAnchorAt, now)}</dd>
        </div>
        <div>
          <dt>Consecutive failures</dt>
          <dd>{health.consecutiveFailureCount}</dd>
        </div>
        <div>
          <dt>Unanchored entries</dt>
          <dd>{health.unanchoredCount}</dd>
        </div>
        <div>
          <dt>Oldest unanchored entry</dt>
          <dd>{formatDuration(health.oldestUnanchoredAgeMs)}</dd>
        </div>
        <div>
          <dt>Pending persist</dt>
          <dd>{health.pendingPersistCount}</dd>
        </div>
      </dl>

      <button type="button" onClick={load}>
        Refresh
      </button>
    </section>
  );
}
