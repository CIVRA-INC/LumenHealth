import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import AuthLandingPage from "../app/auth/page";

describe("AuthLandingPage", () => {
  it("links to sign in and registration", () => {
    render(<AuthLandingPage />);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/login");
    expect(screen.getByRole("link", { name: "Create account" })).toHaveAttribute(
      "href",
      "/auth/register",
    );
  });

  it("renders a single main landmark", () => {
    render(<AuthLandingPage />);
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });
});
