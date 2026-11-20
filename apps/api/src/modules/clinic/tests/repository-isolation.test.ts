import { beforeEach, describe, expect, it } from "vitest";
import type { Clinic } from "@lumen/types";
import { ClinicRepository } from "../repositories/clinic.repository.js";

const clinic = (): Clinic => ({
  clinicId: "c1",
  name: "North Star",
  slug: "north-star",
  address: "1 Main",
  phone: "555",
  email: "a@b.co",
  status: "active",
  ownerId: "u1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("ClinicRepository isolation", () => {
  let repo: ClinicRepository;
  beforeEach(() => {
    repo = new ClinicRepository();
  });

  it("mutating returned clinics does not change the store", () => {
    repo.save(clinic());
    repo.findById("c1")!.name = "Hacked";
    repo.findBySlug("north-star")!.status = "archived";
    repo.list()[0]!.email = "evil@x.test";
    expect(repo.findById("c1")).toMatchObject({ name: "North Star", status: "active", email: "a@b.co" });
  });

  it("mutating the object passed to save() does not change the stored copy", () => {
    const input = clinic();
    const saved = repo.save(input);
    input.name = "Hacked";
    saved.status = "suspended";
    expect(repo.findById("c1")).toMatchObject({ name: "North Star", status: "active" });
  });
});
