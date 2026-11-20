import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SkipLink, MAIN_CONTENT_ID } from "../app/_components/skip-link";

describe("SkipLink", () => {
  it("is a link to the shared main landmark id", () => {
    render(<SkipLink />);
    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      `#${MAIN_CONTENT_ID}`,
    );
  });

  it("is the first focusable element and moves focus to main when activated", () => {
    render(
      <>
        <SkipLink />
        <button type="button">other control</button>
        <main id={MAIN_CONTENT_ID} tabIndex={-1}>
          content
        </main>
      </>,
    );

    const link = screen.getByRole("link", { name: "Skip to main content" });
    link.focus();
    expect(document.activeElement).toBe(link);

    fireEvent.click(link);
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });
});
