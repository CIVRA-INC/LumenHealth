import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

type AuthState = "signed-out" | "authenticating" | "signed-in" | "error";
type AuditState = "idle" | "recording" | "recorded" | "failed";
type VerifyState = "unverified" | "pending" | "verified" | "rejected";

export function MxllvSharedUiStatePreview(props: { auth: AuthState; audit: AuditState; verify: VerifyState }) {
  return (
    <div style={{ fontFamily: "sans-serif", display: "grid", gap: 8 }}>
      <div data-testid="auth">Auth: {props.auth}</div>
      <div data-testid="audit">Audit: {props.audit}</div>
      <div data-testid="verify">Verify: {props.verify}</div>
    </div>
  );
}

const meta: Meta<typeof MxllvSharedUiStatePreview> = {
  title: "Shared/Mxllv Auth Audit Verify States",
  component: MxllvSharedUiStatePreview,
};
export default meta;

type Story = StoryObj<typeof MxllvSharedUiStatePreview>;

export const SignedOut: Story = { args: { auth: "signed-out", audit: "idle", verify: "unverified" } };
export const Authenticating: Story = { args: { auth: "authenticating", audit: "idle", verify: "pending" } };
export const VerifiedAndRecorded: Story = { args: { auth: "signed-in", audit: "recorded", verify: "verified" } };
export const ErrorStates: Story = { args: { auth: "error", audit: "failed", verify: "rejected" } };
