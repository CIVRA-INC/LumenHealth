"use client";

import React from "react";

export interface Eniolaagoro7AccountPanelProps {
  email?: string;
  role?: string;
  onSignOut: () => void | Promise<void>;
  signOutHref?: string;
}

export function Eniolaagoro7AccountSignoutPanel(props: Eniolaagoro7AccountPanelProps) {
  return (
    <main aria-label="Account">
      <h1>Account</h1>
      <section>
        <p data-testid="account-email">Email: {props.email ?? "Unknown"}</p>
        <p data-testid="account-role">Role: {props.role ?? "Unknown"}</p>
      </section>
      <section>
        <button type="button" onClick={() => void props.onSignOut()} data-testid="signout-button">
          Sign out
        </button>
        {props.signOutHref ? (
          <a href={props.signOutHref} data-testid="signout-link">Go to sign out</a>
        ) : null}
      </section>
    </main>
  );
}

export default Eniolaagoro7AccountSignoutPanel;
