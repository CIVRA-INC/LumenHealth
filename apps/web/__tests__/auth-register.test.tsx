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

describe("Register page (AuthScreen mode=register)", () => {
  beforeEach(() => {
    render(<AuthScreen mode="register" />);
  });

  it("renders the create account heading", () => {
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("renders the clinic name input", () => {
    expect(screen.getByPlaceholderText("North Star Clinic")).toBeInTheDocument();
  });

  it("renders the email input", () => {
    expect(screen.getByPlaceholderText("owner@clinic.test")).toBeInTheDocument();
  });

  it("renders the password input", () => {
    const passwordInput = screen.getByPlaceholderText("********");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  it("renders the create account submit button", () => {
    expect(screen.getByRole("button", { name: /create account/i })).toBeInTheDocument();
  });

  it("clinic name input has required attribute", () => {
    expect(screen.getByPlaceholderText("North Star Clinic")).toHaveAttribute("required");
  });

  it("email input has required attribute", () => {
    expect(screen.getByPlaceholderText("owner@clinic.test")).toHaveAttribute("required");
  });

  it("password input has minLength 8", () => {
    expect(screen.getByPlaceholderText("********")).toHaveAttribute("minLength", "8");
  });
});
