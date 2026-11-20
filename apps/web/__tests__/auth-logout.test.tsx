import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import LogoutPage from "../app/auth/logout/page";
import { setStoredAuthSession, getStoredAuthSession } from "../app/auth/session";

const SESSION_KEY = "lumenhealth.auth.session";

describe("LogoutPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("removes the stored session from browser storage on mount", () => {
    setStoredAuthSession({
      userId: "u1",
      clinicId: "c1",
      role: "owner",
      accessToken: "secret-token",
    });
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();

    render(<LogoutPage />);

    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(getStoredAuthSession()).toBeNull();
  });

  it("links back to sign in and home", () => {
    render(<LogoutPage />);
    expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/auth/login",
    );
    expect(screen.getByRole("link", { name: "Go home" })).toHaveAttribute("href", "/");
  });
});
