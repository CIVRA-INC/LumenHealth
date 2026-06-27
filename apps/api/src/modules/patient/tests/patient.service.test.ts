import { describe, it, expect, beforeEach } from "vitest";
import type { CreatePatientRequest, Patient } from "@lumen/types";
import { patientStore } from "../repositories/patient.repository.js";
import {
  createPatient,
  getPatient,
  listPatients,
  updatePatient,
  archivePatient,
} from "../services/patient.service.js";

function makeRequest(
  overrides: Partial<CreatePatientRequest> = {},
): CreatePatientRequest {
  return {
    identifier: overrides.identifier ?? "MRN-001",
    givenName: overrides.givenName ?? "Ada",
    familyName: overrides.familyName ?? "Lovelace",
    birthDate: overrides.birthDate ?? "1815-12-10",
    phone: overrides.phone ?? "+441234567890",
    email: overrides.email ?? "ada@example.com",
    address: overrides.address ?? "1 Science Park",
  };
}

function expectSuccess(result: Patient | { error: string; message: string }): Patient {
  if ("error" in result) {
    throw new Error(`expected success but got error: ${result.error}`);
  }
  return result;
}

describe("patient.service — createPatient", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("creates a new patient with a UUID, status=active, and ISO timestamps", () => {
    const result = createPatient(makeRequest(), "clinic_a");
    const patient = expectSuccess(result);
    expect(patient.patientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(patient.clinicId).toBe("clinic_a");
    expect(patient.status).toBe("active");
    expect(patient.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(patient.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("trims whitespace on string fields", () => {
    const patient = expectSuccess(
      createPatient(
        makeRequest({
          givenName: "  Ada  ",
          familyName: "Lovelace",
          address: "  1 Science Park  ",
        }),
        "clinic_a",
      ),
    );
    expect(patient.givenName).toBe("Ada");
    expect(patient.address).toBe("1 Science Park");
  });

  it("returns PATIENT_IDENTIFIER_TAKEN when same identifier in same clinic", () => {
    expectSuccess(createPatient(makeRequest({ identifier: "MRN-DUP" }), "clinic_a"));
    const result = createPatient(
      makeRequest({ identifier: "MRN-DUP" }),
      "clinic_a",
    );
    if (!("error" in result)) {
      throw new Error("expected error on duplicate, got patient");
    }
    expect(result.error).toBe("PATIENT_IDENTIFIER_TAKEN");
    expect(typeof result.message).toBe("string");
    expect(result.message.length).toBeGreaterThan(0);
  });

  it("allows the same identifier across different clinics", () => {
    const a = expectSuccess(createPatient(makeRequest({ identifier: "X" }), "clinic_a"));
    const b = expectSuccess(createPatient(makeRequest({ identifier: "X" }), "clinic_b"));
    expect(a.patientId).not.toBe(b.patientId);
  });
});

describe("patient.service — getPatient", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("returns the patient when callerClinicId matches", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const fetched = getPatient(created.patientId, "clinic_a");
    expect(fetched).not.toBeNull();
    expect(fetched?.patientId).toBe(created.patientId);
  });

  it("returns null when callerClinicId is a different clinic", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    expect(getPatient(created.patientId, "clinic_b")).toBeNull();
  });

  it("returns null for an unknown patientId", () => {
    expect(getPatient("does-not-exist", "clinic_a")).toBeNull();
  });
});

describe("patient.service — listPatients", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("returns paginated results scoped to callerClinicId", () => {
    expectSuccess(createPatient(makeRequest({ identifier: "A" }), "clinic_a"));
    expectSuccess(createPatient(makeRequest({ identifier: "B" }), "clinic_a"));
    expectSuccess(createPatient(makeRequest({ identifier: "C" }), "clinic_a"));
    expectSuccess(createPatient(makeRequest({ identifier: "X" }), "clinic_b"));

    const page = listPatients("clinic_a", { limit: 10, offset: 0 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(3);
    expect(page.limit).toBe(10);
    expect(page.offset).toBe(0);
  });

  it("respects limit and offset", () => {
    for (let i = 0; i < 30; i++) {
      expectSuccess(
        createPatient(makeRequest({ identifier: `mrn-${i}` }), "clinic_a"),
      );
    }
    const first = listPatients("clinic_a", { limit: 10, offset: 0 });
    const second = listPatients("clinic_a", { limit: 10, offset: 25 });
    expect(first.items).toHaveLength(10);
    expect(second.items).toHaveLength(5);
    expect(first.total).toBe(30);
  });

  it("returns only the sanitized PatientListItem shape (no PII)", () => {
    expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const page = listPatients("clinic_a");
    expect(page.items).toHaveLength(1);
    const item = page.items[0];
    const allowedKeys = [
      "clinicId",
      "familyName",
      "givenName",
      "identifier",
      "patientId",
      "status",
    ];
    expect(Object.keys(item).sort()).toEqual([...allowedKeys].sort());
  });

  it("returns an empty page for an unknown clinic", () => {
    expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const page = listPatients("clinic_unknown");
    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });
});

describe("patient.service — updatePatient", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("applies a partial patch and bumps updatedAt", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const patched = updatePatient(created.patientId, "clinic_a", {
      givenName: "Augusta",
    });
    expect(patched).not.toBeNull();
    expect(patched?.givenName).toBe("Augusta");
    expect(patched?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("leaves fields unset in the patch unchanged", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const patched = updatePatient(created.patientId, "clinic_a", {
      phone: "+15555550100",
    });
    expect(patched?.phone).toBe("+15555550100");
    expect(patched?.givenName).toBe(created.givenName);
    expect(patched?.email).toBe(created.email);
  });

  it("returns null when callerClinicId is a different clinic", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    expect(
      updatePatient(created.patientId, "clinic_b", { givenName: "X" }),
    ).toBeNull();
  });

  it("returns null for an unknown patientId", () => {
    expect(
      updatePatient("does-not-exist", "clinic_a", { givenName: "X" }),
    ).toBeNull();
  });

  it("sets archivedAt when transitioning status to 'archived'", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const patched = updatePatient(created.patientId, "clinic_a", {
      status: "archived",
    });
    expect(patched).not.toBeNull();
    expect(patched?.status).toBe("archived");
    expect(patched?.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("clears archivedAt when transitioning status away from 'archived'", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    expect(archivePatient(created.patientId, "clinic_a")).not.toBeNull();
    const patched = updatePatient(created.patientId, "clinic_a", {
      status: "inactive",
    });
    expect(patched).not.toBeNull();
    expect(patched?.status).toBe("inactive");
    expect(patched?.archivedAt).toBeUndefined();
  });

  it("preserves archivedAt when an archived patient receives a non-status patch", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    expect(archivePatient(created.patientId, "clinic_a")).not.toBeNull();
    const prior = getPatient(created.patientId, "clinic_a");
    expect(prior?.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const patched = updatePatient(created.patientId, "clinic_a", {
      phone: "+15555550100",
    });
    expect(patched).not.toBeNull();
    expect(patched?.status).toBe("archived");
    expect(patched?.archivedAt).toBe(prior?.archivedAt);
  });

  it("does not set archivedAt for a non-status patch on a non-archived patient", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const patched = updatePatient(created.patientId, "clinic_a", {
      phone: "+15555550100",
    });
    expect(patched).not.toBeNull();
    expect(patched?.status).toBe("active");
    expect(patched?.archivedAt).toBeUndefined();
  });

  it("preserves archivedAt when an archived patient receives a redundant archive patch", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    expect(archivePatient(created.patientId, "clinic_a")).not.toBeNull();
    const prior = getPatient(created.patientId, "clinic_a");
    expect(prior?.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const patched = updatePatient(created.patientId, "clinic_a", {
      status: "archived",
    });
    expect(patched).not.toBeNull();
    expect(patched?.status).toBe("archived");
    expect(patched?.archivedAt).toBe(prior?.archivedAt);
  });
});

describe("patient.service — archivePatient", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("sets status='archived' and stamps archivedAt on success", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    const archived = archivePatient(created.patientId, "clinic_a");
    expect(archived).not.toBeNull();
    expect(archived?.status).toBe("archived");
    expect(typeof archived?.archivedAt).toBe("string");
    expect(archived?.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns null when callerClinicId is a different clinic", () => {
    const created = expectSuccess(createPatient(makeRequest(), "clinic_a"));
    expect(archivePatient(created.patientId, "clinic_b")).toBeNull();
  });

  it("returns null for an unknown patientId", () => {
    expect(archivePatient("does-not-exist", "clinic_a")).toBeNull();
  });
});
