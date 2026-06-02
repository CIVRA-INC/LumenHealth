"use client";

import Link from "next/link";
import { useEffect } from "react";
import { clearStoredAuthSession } from "../session";

export default function LogoutPage() {
  useEffect(() => {
    clearStoredAuthSession();
  }, []);

  return (
    <main className="authPage">
      <section className="authCard">
        <p className="eyebrow">Session cleared</p>
        <h1>You are signed out.</h1>
        <p className="authLead">
          The web app clears the stored session token and user payload before sending you back to
          the public auth entry point.
        </p>

        <div className="authStatus authStatus--success" aria-live="polite">
          <p>Your local auth session has been removed from browser storage.</p>
        </div>

        <div className="authFooter">
          <Link href="/auth/login" className="primary">
            Back to sign in
          </Link>
          <Link href="/" className="secondary">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
