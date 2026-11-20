import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthCard } from "../app/auth/_components/auth-card";

const props = {
  eyebrow: "Eyebrow",
  title: "Card title",
  description: "Card description",
};

describe("AuthCard", () => {
  it("renders the heading, eyebrow, description and children", () => {
    render(
      <AuthCard {...props}>
        <p>child content</p>
      </AuthCard>,
    );
    expect(screen.getByRole("heading", { name: "Card title" })).toBeInTheDocument();
    expect(screen.getByText("Eyebrow")).toBeInTheDocument();
    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("renders the footer only when one is provided", () => {
    const { container, rerender } = render(
      <AuthCard {...props} footer={<a href="/x">footer link</a>}>
        body
      </AuthCard>,
    );
    expect(screen.getByText("footer link")).toBeInTheDocument();
    expect(container.querySelector(".authCardFooter")).not.toBeNull();

    rerender(<AuthCard {...props}>body</AuthCard>);
    expect(screen.queryByText("footer link")).not.toBeInTheDocument();
    expect(container.querySelector(".authCardFooter")).toBeNull();
  });
});
