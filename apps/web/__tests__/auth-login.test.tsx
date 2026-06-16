import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthScreen } from "../app/auth/_components/auth-screen";

vi.mock("@lumen/config/public", () => ({
  getPublicRuntimeConfig: () => ({ apiBaseUrl: "http://localhost:4000" }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe("Login page (AuthScreen mode=login)", () => {
  beforeEach(() => {
    render(<AuthScreen mode="login" />);
  });

  it("renders the sign-in heading", () => {
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders an email input", () => {
    expect(screen.getByPlaceholderText("owner@clinic.test")).toBeInTheDocument();
  });

  it("renders a password input", () => {
    const passwordInput = screen.getByPlaceholderText("********");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("renders the submit button", () => {
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("does not render the clinic name field", () => {
    expect(screen.queryByPlaceholderText("North Star Clinic")).not.toBeInTheDocument();
  });

  it("email input has required attribute", () => {
    expect(screen.getByPlaceholderText("owner@clinic.test")).toHaveAttribute("required");
  });

  it("password input has minLength 8", () => {
    expect(screen.getByPlaceholderText("********")).toHaveAttribute("minLength", "8");
  });
});
