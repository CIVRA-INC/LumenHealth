import { describe, it, expect, beforeEach } from "vitest";
import type { Patient, PatientStatus } from "@lumen/types";
import { patientStore } from "../repositories/patient.repository.js";
import {
  validateCreatePatient,
  validateUpdatePatient,
} from "../validators/patient.validator.js";

function makePatient(overrides: Partial<Patient> = {}): Patient {
  const now = "2026-01-01T00:00:00.000Z";
  return {
    patientId: overrides.patientId ?? "pat_test_1",
    clinicId: overrides.clinicId ?? "clinic_a",
    identifier: overrides.identifier ?? "MRN-001",
    givenName: overrides.givenName ?? "Ada",
    familyName: overrides.familyName ?? "Lovelace",
    birthDate: overrides.birthDate ?? "1815-12-10",
    phone: overrides.phone ?? "+441234567890",
    email: overrides.email ?? "ada@example.com",
    address: overrides.address ?? "1 Science Park",
    status: overrides.status ?? ("active" as PatientStatus),
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe("patientStore", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("saves and retrieves a patient by id", () => {
    patientStore.save(makePatient({ patientId: "pat_1" }));
    expect(patientStore.findById("pat_1")?.identifier).toBe("MRN-001");
  });

  it("returns undefined for an unknown id", () => {
    expect(patientStore.findById("missing")).toBeUndefined();
  });

  it("finds by (clinicId, identifier) case-insensitively", () => {
    patientStore.save(makePatient({ patientId: "pat_1", identifier: "MRN-001" }));
    patientStore.save(
      makePatient({ patientId: "pat_2", clinicId: "clinic_b", identifier: "mrn-001" }),
    );
    expect(patientStore.findByIdentifier("clinic_a", "MRN-001")?.patientId).toBe("pat_1");
    expect(patientStore.findByIdentifier("clinic_a", "mrn-001")?.patientId).toBe("pat_1");
    expect(patientStore.findByIdentifier("clinic_b", "MRN-001")?.patientId).toBe("pat_2");
  });

  it("distinguishes the same identifier across different clinics", () => {
    patientStore.save(makePatient({ patientId: "p1", clinicId: "a", identifier: "X" }));
    patientStore.save(makePatient({ patientId: "p2", clinicId: "b", identifier: "X" }));
    expect(patientStore.findByIdentifier("a", "X")?.patientId).toBe("p1");
    expect(patientStore.findByIdentifier("b", "X")?.patientId).toBe("p2");
  });

  it("lists with optional clinicId and status filters", () => {
    patientStore.save(makePatient({ patientId: "p1", clinicId: "a", status: "active" }));
    patientStore.save(makePatient({ patientId: "p2", clinicId: "a", status: "inactive" }));
    patientStore.save(makePatient({ patientId: "p3", clinicId: "b", status: "active" }));

    expect(patientStore.list()).toHaveLength(3);
    expect(patientStore.list({ clinicId: "a" })).toHaveLength(2);
    expect(patientStore.list({ clinicId: "a", status: "active" })).toHaveLength(1);
    expect(patientStore.list({ status: "active" })).toHaveLength(2);
  });

  it("_reset clears the store and the identifier index", () => {
    patientStore.save(makePatient({ identifier: "MRN-001" }));
    patientStore._reset();
    expect(patientStore.list()).toHaveLength(0);
    expect(patientStore.findByIdentifier("clinic_a", "MRN-001")).toBeUndefined();
  });
});

const VALID = {
  identifier: "MRN-001",
  givenName: "Ada",
  familyName: "Lovelace",
  birthDate: "1815-12-10",
  phone: "+441234567890",
  email: "ada@example.com",
  address: "1 Science Park",
};

describe("validateCreatePatient", () => {
  it("accepts a well-formed body", () => {
    expect(validateCreatePatient(VALID).ok).toBe(true);
  });

  it("rejects a malformed birthDate", () => {
    const result = validateCreatePatient({ ...VALID, birthDate: "12/10/1815" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("birthDate");
  });

  it("rejects a malformed email", () => {
    const result = validateCreatePatient({ ...VALID, email: "not-an-email" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("email");
  });

  it("rejects an empty required string field", () => {
    const result = validateCreatePatient({ ...VALID, givenName: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("givenName");
  });

  it("rejects a phone outside the min/max length", () => {
    expect(validateCreatePatient({ ...VALID, phone: "12" }).ok).toBe(false);
    expect(
      validateCreatePatient({ ...VALID, phone: "1".repeat(40) }).ok,
    ).toBe(false);
  });

  it("rejects givenName longer than 120 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      givenName: "a".repeat(121),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("givenName");
  });

  it("rejects familyName longer than 120 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      familyName: "a".repeat(121),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("familyName");
  });

  it("accepts givenName of exactly 120 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      givenName: "a".repeat(120),
    });
    expect(result.ok).toBe(true);
  });

  it("accepts identifier of up to 240 characters", () => {
    const result = validateCreatePatient({
      ...VALID,
      identifier: "I".repeat(240),
    });
    expect(result.ok).toBe(true);
  });
});

describe("validateUpdatePatient", () => {
  it("accepts a partial body with only allowed fields", () => {
    expect(validateUpdatePatient({ givenName: "Augusta" }).ok).toBe(true);
  });

  it("accepts an empty body", () => {
    expect(validateUpdatePatient({}).ok).toBe(true);
  });

  it("rejects unknown fields", () => {
    const result = validateUpdatePatient({ notAField: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("notAField");
  });

  it("rejects an unrecognized status", () => {
    const result = validateUpdatePatient({ status: "deleted" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe("status");
  });

  it("rejects empty-string optional fields", () => {
    expect(validateUpdatePatient({ phone: "" }).ok).toBe(false);
    expect(validateUpdatePatient({ address: "" }).ok).toBe(false);
  });
});

describe("findByClinicAndName", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("returns partial matches scoped to clinicId", () => {
    patientStore.save(
      makePatient({
        patientId: "p1",
        clinicId: "a",
        givenName: "Ada",
        familyName: "Lovelace",
      }),
    );
    patientStore.save(
      makePatient({
        patientId: "p2",
        clinicId: "a",
        givenName: "Alan",
        familyName: "Turing",
      }),
    );
    patientStore.save(
      makePatient({
        patientId: "p3",
        clinicId: "b",
        givenName: "Ada",
        familyName: "Byron",
      }),
    );

    expect(
      patientStore.findByClinicAndName("a", "ada").map((p) => p.patientId),
    ).toEqual(["p1"]);
    expect(
      patientStore.findByClinicAndName("b", "ada").map((p) => p.patientId),
    ).toEqual(["p3"]);
  });

  it("is case-insensitive across given and family names", () => {
    patientStore.save(
      makePatient({
        patientId: "p1",
        clinicId: "clinic_a",
        givenName: "Ada",
        familyName: "Lovelace",
      }),
    );
    expect(
      patientStore
        .findByClinicAndName("clinic_a", "ADA")
        .map((p) => p.patientId),
    ).toEqual(["p1"]);
    expect(
      patientStore
        .findByClinicAndName("clinic_a", "ada")
        .map((p) => p.patientId),
    ).toEqual(["p1"]);
    expect(
      patientStore
        .findByClinicAndName("clinic_a", "lovelace")
        .map((p) => p.patientId),
    ).toEqual(["p1"]);
  });

  it("matches partial names by substring", () => {
    patientStore.save(
      makePatient({
        patientId: "p1",
        clinicId: "clinic_a",
        givenName: "Augusta",
        familyName: "Byron",
      }),
    );
    patientStore.save(
      makePatient({
        patientId: "p2",
        clinicId: "clinic_a",
        givenName: "Algernon",
        familyName: "Blackwood",
      }),
    );
    expect(
      patientStore
        .findByClinicAndName("clinic_a", "al")
        .map((p) => p.patientId),
    ).toEqual(["p2"]);
    expect(
      patientStore
        .findByClinicAndName("clinic_a", "au")
        .map((p) => p.patientId),
    ).toEqual(["p1"]);
  });

  it("returns empty for empty or whitespace queries", () => {
    patientStore.save(makePatient({}));
    expect(
      patientStore.findByClinicAndName("clinic_a", ""),
    ).toEqual([]);
    expect(
      patientStore.findByClinicAndName("clinic_a", "   "),
    ).toEqual([]);
  });

  it("caps results at the limit", () => {
    for (let i = 0; i < 60; i++) {
      patientStore.save(
        makePatient({
          patientId: `p${i}`,
          identifier: `mrn-${i}`,
          givenName: "Same",
          familyName: "Name",
        }),
      );
    }
    expect(
      patientStore.findByClinicAndName("clinic_a", "same").length,
    ).toBe(50);
    expect(
      patientStore.findByClinicAndName("clinic_a", "same", 5).length,
    ).toBe(5);
  });
});

describe("listPaginated", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("paginates and reports total", () => {
    for (let i = 0; i < 30; i++) {
      patientStore.save(
        makePatient({ patientId: `p${i}`, identifier: `mrn-${i}` }),
      );
    }
    const page1 = patientStore.listPaginated("clinic_a", {
      limit: 10,
      offset: 0,
    });
    expect(page1.items.length).toBe(10);
    expect(page1.total).toBe(30);
    expect(page1.limit).toBe(10);

    const page2 = patientStore.listPaginated("clinic_a", {
      limit: 10,
      offset: 25,
    });
    expect(page2.items.length).toBe(5);
  });

  it("clamps limit between 1 and 50 and offset ≥ 0", () => {
    for (let i = 0; i < 60; i++) {
      patientStore.save(
        makePatient({ patientId: `p${i}`, identifier: `mrn-${i}` }),
      );
    }
    expect(patientStore.listPaginated("clinic_a", { limit: 0 }).limit).toBe(1);
    expect(
      patientStore.listPaginated("clinic_a", { limit: 100 }).limit,
    ).toBe(50);
    expect(
      patientStore.listPaginated("clinic_a", { offset: -5 }).offset,
    ).toBe(0);
  });

  it("scopes to clinicId before paginating", () => {
    patientStore.save(
      makePatient({ patientId: "p1", clinicId: "a", identifier: "mrn-1" }),
    );
    patientStore.save(
      makePatient({ patientId: "p2", clinicId: "b", identifier: "mrn-2" }),
    );
    expect(
      patientStore.listPaginated("a", { limit: 10 }).total,
    ).toBe(1);
    expect(
      patientStore.listPaginated("b", { limit: 10 }).total,
    ).toBe(1);
  });
});

describe("saveStrict", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("returns ok when the (clinicId, identifier) pair is unused", () => {
    const result = patientStore.saveStrict(makePatient({ patientId: "p1" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patient.patientId).toBe("p1");
  });

  it("returns ok when re-saving the same patient with same identifier", () => {
    patientStore.saveStrict(makePatient({ patientId: "p1" }));
    const result = patientStore.saveStrict(
      makePatient({ patientId: "p1" }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects when a different patient claims the same identifier in the same clinic", () => {
    patientStore.saveStrict(
      makePatient({ patientId: "p1", identifier: "MRN-1" }),
    );
    const result = patientStore.saveStrict(
      makePatient({ patientId: "p2", identifier: "MRN-1" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("PATIENT_IDENTIFIER_TAKEN");
  });

  it("allows the same identifier across different clinics", () => {
    patientStore.saveStrict(
      makePatient({ patientId: "p1", clinicId: "a", identifier: "X" }),
    );
    const result = patientStore.saveStrict(
      makePatient({ patientId: "p2", clinicId: "b", identifier: "X" }),
    );
    expect(result.ok).toBe(true);
  });

  it("returns PATIENT_IDENTIFIER_TAKEN with a non-empty message on rejection", () => {
    patientStore.saveStrict(
      makePatient({ patientId: "p1", identifier: "MRN-1" }),
    );
    const result = patientStore.saveStrict(
      makePatient({ patientId: "p2", identifier: "MRN-1" }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("PATIENT_IDENTIFIER_TAKEN");
      expect(typeof result.message).toBe("string");
      expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

it("saveStrict preserves the identifier index when rejecting a duplicate", () => {
  patientStore.saveStrict(
    makePatient({ patientId: "p1", identifier: "MRN-1" }),
  );
  patientStore.saveStrict(
    makePatient({ patientId: "p2", identifier: "MRN-1" }),
  );
  expect(
    patientStore.findByIdentifier("clinic_a", "MRN-1")?.patientId,
  ).toBe("p1");
});

it("archiveById preserves the identifier index", () => {
  patientStore.save(makePatient({ patientId: "p1", identifier: "MRN-1" }));
  patientStore.archiveById("p1");
  expect(
    patientStore.findByIdentifier("clinic_a", "MRN-1")?.patientId,
  ).toBe("p1");
  expect(patientStore.findById("p1")?.status).toBe("archived");
});

it("listPaginated returns results in stable insertion order", () => {
  patientStore.save(makePatient({ patientId: "p1", identifier: "mrn-1" }));
  patientStore.save(makePatient({ patientId: "p2", identifier: "mrn-2" }));
  patientStore.save(makePatient({ patientId: "p3", identifier: "mrn-3" }));
  const page = patientStore.listPaginated("clinic_a", {
    limit: 10,
    offset: 0,
  });
  expect(page.items.map((x) => x.patientId)).toEqual(["p1", "p2", "p3"]);
});

it("findByClinicAndName returns only the sanitized PatientListItem shape", () => {
  patientStore._reset();
  patientStore.save(makePatient({ patientId: "p1" }));
  const result = patientStore.findByClinicAndName("clinic_a", "ada");
  expect(result).toHaveLength(1);
  const item = result[0];
  expect(item.patientId).toBe("p1");
  // Structural absence of disallowed PII fields. PatientListItem should only
  // expose patientId, clinicId, identifier, givenName, familyName, status.
  const allowedKeys = [
    "patientId",
    "clinicId",
    "identifier",
    "givenName",
    "familyName",
    "status",
  ];
  const itemKeys = Object.keys(item);
  expect(itemKeys.sort()).toEqual(allowedKeys.sort());
});

describe("archiveById", () => {
  beforeEach(() => {
    patientStore._reset();
  });

  it("returns null for an unknown id", () => {
    expect(patientStore.archiveById("missing")).toBeNull();
  });

  it("sets status='archived' and stamps archivedAt", () => {
    patientStore.save(
      makePatient({ patientId: "p1", status: "active" }),
    );
    const archived = patientStore.archiveById("p1");
    expect(archived).not.toBeNull();
    expect(archived!.status).toBe("archived");
    expect(typeof archived!.archivedAt).toBe("string");
    expect(archived!.archivedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
