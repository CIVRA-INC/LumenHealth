"use client";

import Link from "next/link";
import { useAuthSession } from "./session-provider";

export function AuthSessionSummary() {
  const { session } = useAuthSession();

  return (
    <section className="panel authSessionPanel">
      <h2>Session boundary</h2>
      {session ? (
        <>
          <p className="lede">
            Signed in as <strong>{session.userId}</strong> with the <strong>{session.role}</strong>{" "}
            role for clinic <strong>{session.clinicId}</strong>.
          </p>
          <p className="authSessionMeta">
            The provider keeps the shell session-aware so future auth pages can read the same
            boundary without re-implementing storage logic.
          </p>
        </>
      ) : (
        <>
          <p className="lede">No active session is available in the browser shell yet.</p>
          <p className="authSessionMeta">
            The provider still exposes a single boundary for session access, which keeps auth
            logic out of page components.
          </p>
        </>
      )}
      <div className="actions authSessionActions">
        <Link href="/auth/login" className="primary">
          Open auth entry
        </Link>
      </div>
    </section>
  );
}
