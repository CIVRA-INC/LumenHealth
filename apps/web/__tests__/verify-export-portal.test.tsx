import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuditExportBundle, AuditExportVerifyReport } from "@lumen/types";

const mockVerifyExportBundle = vi.fn();

vi.mock("../app/verify/api", () => ({
  verifyExportBundle: (...args: unknown[]) => mockVerifyExportBundle(...args),
}));

import { VerifyExportPortal } from "../app/verify/_components/verify-export-portal";

const bundle: AuditExportBundle = {
  manifest: {
    clinicId: "c-1",
    generatedAt: "2026-01-01T00:00:00.000Z",
    range: {},
    entryCount: 1,
    entriesDigest: "digest-1",
  },
  signature: "sig",
  signingPublicKey: "GPUB",
  entries: [
    {
      auditId: "a-1",
      clinicId: "c-1",
      action: "staff.invited",
      actorId: "actor-1",
      actorRole: "owner",
      createdAt: "2026-01-01T00:00:00.000Z",
      sha256Hash: "hash-1",
    },
  ],
};

function makeFile(contents: unknown, name = "export.json"): File {
  return new File([JSON.stringify(contents)], name, { type: "application/json" });
}

function uploadFile(file: File) {
  const input = screen.getByLabelText(/compliance export bundle file/i) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
}

beforeEach(() => {
  mockVerifyExportBundle.mockReset();
});

describe("VerifyExportPortal", () => {
  it("renders a dropzone with no session/auth required", () => {
    render(<VerifyExportPortal />);
    expect(screen.getByTestId("verify-dropzone")).toBeInTheDocument();
  });

  it("verifies an uploaded bundle and renders a clean report", async () => {
    const report: AuditExportVerifyReport = {
      clinicId: "c-1",
      signatureValid: true,
      entriesDigestValid: true,
      results: [{ auditId: "a-1", action: "staff.invited", status: "verified" }],
      verifiedCount: 1,
      unanchoredCount: 0,
      tamperedCount: 0,
      ok: true,
    };
    mockVerifyExportBundle.mockResolvedValue(report);

    render(<VerifyExportPortal />);
    uploadFile(makeFile(bundle));

    await waitFor(() => expect(mockVerifyExportBundle).toHaveBeenCalledWith(bundle));
    expect(await screen.findByText(/no tampering detected/i)).toBeInTheDocument();
    expect(screen.getByText("c-1")).toBeInTheDocument();
  });

  it("renders a failed report distinctly when an entry is tampered", async () => {
    const report: AuditExportVerifyReport = {
      clinicId: "c-1",
      signatureValid: true,
      entriesDigestValid: true,
      results: [
        {
          auditId: "a-1",
          action: "staff.invited",
          status: "tampered",
          reason: "stored content no longer matches its recorded hash",
        },
      ],
      verifiedCount: 0,
      unanchoredCount: 0,
      tamperedCount: 1,
      ok: false,
    };
    mockVerifyExportBundle.mockResolvedValue(report);

    render(<VerifyExportPortal />);
    uploadFile(makeFile(bundle));

    expect(await screen.findByText(/verification failed/i)).toBeInTheDocument();
    expect(screen.getByText("Tampered")).toBeInTheDocument();
  });

  it("shows an error and never calls the API for a file that isn't valid JSON", async () => {
    render(<VerifyExportPortal />);
    const badFile = new File(["{ this is not json"], "broken.json", { type: "application/json" });
    const input = screen.getByLabelText(/compliance export bundle file/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/isn't valid json/i);
    expect(mockVerifyExportBundle).not.toHaveBeenCalled();
  });

  it("shows an error and never calls the API for well-formed JSON that isn't a bundle", async () => {
    render(<VerifyExportPortal />);
    uploadFile(makeFile({ hello: "world" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/doesn't look like/i);
    expect(mockVerifyExportBundle).not.toHaveBeenCalled();
  });

  it("surfaces an API error message when verification fails to reach the server", async () => {
    mockVerifyExportBundle.mockRejectedValue(new Error("Failed to verify export bundle (502)"));

    render(<VerifyExportPortal />);
    uploadFile(makeFile(bundle));

    expect(await screen.findByRole("alert")).toHaveTextContent(/502/);
  });

  it("lets the user check another file after a report is shown", async () => {
    const report: AuditExportVerifyReport = {
      clinicId: "c-1",
      signatureValid: true,
      entriesDigestValid: true,
      results: [],
      verifiedCount: 0,
      unanchoredCount: 0,
      tamperedCount: 0,
      ok: true,
    };
    mockVerifyExportBundle.mockResolvedValue(report);

    render(<VerifyExportPortal />);
    uploadFile(makeFile(bundle));

    await screen.findByText(/no tampering detected/i);
    fireEvent.click(screen.getByRole("button", { name: /check another file/i }));

    expect(screen.queryByText(/no tampering detected/i)).not.toBeInTheDocument();
  });
});
