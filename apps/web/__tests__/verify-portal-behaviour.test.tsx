import "@testing-library/jest-dom";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditExportBundle, AuditExportVerifyReport } from "@lumen/types";

const mockVerifyExportBundle = vi.fn();
vi.mock("../app/verify/api", () => ({
  verifyExportBundle: (...args: unknown[]) => mockVerifyExportBundle(...args),
}));

import { VerifyExportPortal } from "../app/verify/_components/verify-export-portal";

const bundle: AuditExportBundle = {
  manifest: { clinicId: "c-1", generatedAt: "2026-01-01T00:00:00.000Z", range: {}, entryCount: 1, entriesDigest: "d" },
  signature: "sig",
  signingPublicKey: "GPUB",
  entries: [],
};

const reportFor = (clinicId: string, results: AuditExportVerifyReport["results"]): AuditExportVerifyReport => ({
  clinicId,
  signatureValid: true,
  entriesDigestValid: true,
  results,
  verifiedCount: results.length,
  unanchoredCount: 0,
  tamperedCount: 0,
  ok: true,
});

const verifiedResult = [{ auditId: "a-1", action: "staff.invited", status: "verified" as const }];

const file = (name: string) => new File([JSON.stringify(bundle)], name, { type: "application/json" });

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const dropzone = () => screen.getByTestId("verify-dropzone");
const drop = (f: File) => fireEvent.drop(dropzone(), { dataTransfer: { files: [f] } });
const pick = (f: File) =>
  fireEvent.change(screen.getByLabelText(/compliance export bundle file/i), { target: { files: [f] } });

beforeEach(() => mockVerifyExportBundle.mockReset());

describe("drag-and-drop while busy (#1507)", () => {
  it("ignores a second drop while a verification is running", async () => {
    const first = deferred<AuditExportVerifyReport>();
    mockVerifyExportBundle.mockReturnValueOnce(first.promise);
    render(<VerifyExportPortal />);

    drop(file("a.json"));
    await waitFor(() => expect(mockVerifyExportBundle).toHaveBeenCalledTimes(1));

    drop(file("b.json"));
    await act(async () => undefined);
    expect(mockVerifyExportBundle).toHaveBeenCalledTimes(1);
    expect(screen.getByText("File: a.json")).toBeInTheDocument();

    await act(async () => first.resolve(reportFor("clinic-A", verifiedResult)));
    expect(await screen.findByText("clinic-A")).toBeInTheDocument();
    expect(screen.getByText("File: a.json")).toBeInTheDocument();
  });

  it("shows the report that belongs to the latest accepted file", async () => {
    mockVerifyExportBundle.mockResolvedValueOnce(reportFor("clinic-A", verifiedResult));
    mockVerifyExportBundle.mockResolvedValueOnce(reportFor("clinic-B", verifiedResult));
    render(<VerifyExportPortal />);

    drop(file("a.json"));
    await screen.findByText("clinic-A");
    fireEvent.click(screen.getByRole("button", { name: /check another file/i }));

    drop(file("b.json"));
    expect(await screen.findByText("clinic-B")).toBeInTheDocument();
    expect(screen.getByText("File: b.json")).toBeInTheDocument();
    expect(screen.queryByText("clinic-A")).not.toBeInTheDocument();
  });

  it("marks the dropzone while a file is dragged over it and clears it afterwards", () => {
    render(<VerifyExportPortal />);
    fireEvent.dragOver(dropzone(), { dataTransfer: { dropEffect: "none" } });
    expect(dropzone()).toHaveClass("verifyDropzone--active");
    fireEvent.dragLeave(dropzone());
    expect(dropzone()).not.toHaveClass("verifyDropzone--active");
  });
});

describe("retrying after an error (#1508)", () => {
  it("re-runs the last file from the Try again button", async () => {
    mockVerifyExportBundle.mockRejectedValueOnce(new Error("temporary failure"));
    mockVerifyExportBundle.mockResolvedValueOnce(reportFor("clinic-A", verifiedResult));
    render(<VerifyExportPortal />);

    pick(file("a.json"));
    expect(await screen.findByRole("alert")).toHaveTextContent("temporary failure");

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("clinic-A")).toBeInTheDocument();
    expect(mockVerifyExportBundle).toHaveBeenCalledTimes(2);
  });

  it("clears the input value so the same file can be chosen again", async () => {
    mockVerifyExportBundle.mockRejectedValueOnce(new Error("temporary failure"));
    mockVerifyExportBundle.mockResolvedValueOnce(reportFor("clinic-A", verifiedResult));
    render(<VerifyExportPortal />);
    const input = screen.getByLabelText(/compliance export bundle file/i) as HTMLInputElement;

    pick(file("a.json"));
    await screen.findByRole("alert");
    expect(input.value).toBe("");

    pick(file("a.json"));
    expect(await screen.findByText("clinic-A")).toBeInTheDocument();
    expect(mockVerifyExportBundle).toHaveBeenCalledTimes(2);
  });
});

describe("empty export bundles (#1509)", () => {
  it("shows a neutral message instead of a success verdict when there are no entries", async () => {
    mockVerifyExportBundle.mockResolvedValue(reportFor("c-1", []));
    render(<VerifyExportPortal />);

    pick(file("empty.json"));

    expect(await screen.findByText(/this bundle contains no entries/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /nothing to verify/i })).toBeInTheDocument();
    expect(screen.queryByText(/no tampering detected/i)).not.toBeInTheDocument();
    expect(screen.getByText(/no entries in this bundle/i)).toBeInTheDocument();
    expect(document.querySelector(".verifyReport--ok")).toBeNull();
  });

  it("announces the verdict in a live region", async () => {
    mockVerifyExportBundle.mockResolvedValue(reportFor("c-1", verifiedResult));
    render(<VerifyExportPortal />);

    pick(file("a.json"));

    const heading = await screen.findByRole("heading", { name: /verified — no tampering detected/i });
    expect(heading.closest("[role='status']")).not.toBeNull();
  });

  it("leaves reports with entries unchanged", async () => {
    mockVerifyExportBundle.mockResolvedValue(reportFor("c-1", verifiedResult));
    render(<VerifyExportPortal />);
    pick(file("a.json"));

    expect(await screen.findByText(/no tampering detected/i)).toBeInTheDocument();
    expect(screen.queryByText(/nothing to verify/i)).not.toBeInTheDocument();
  });
});
