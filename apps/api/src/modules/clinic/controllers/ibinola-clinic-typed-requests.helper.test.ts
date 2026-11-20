import { describe, expect, it } from "vitest";
import type { CreateClinicRequest, UpdateClinicRequest } from "@lumen/types";
import {
  ibinolaToTypedCreateClinicRequest,
  ibinolaToTypedUpdateClinicRequest,
} from "./ibinola-clinic-typed-requests.helper.js";

describe("ibinola clinic typed requests helper", () => {
  it("maps unknown body to typed CreateClinicRequest", () => {
    const result: CreateClinicRequest = ibinolaToTypedCreateClinicRequest({
      name: "Sunrise Clinic",
      address: "12 Main St",
      phone: "+2348012345678",
      email: "admin@sunrise.clinic",
      extra: "ignored",
    });
    expect(result).toEqual({
      name: "Sunrise Clinic",
      address: "12 Main St",
      phone: "+2348012345678",
      email: "admin@sunrise.clinic",
    });
  });

  it("maps partial body to typed UpdateClinicRequest and rejects invalid create", () => {
    const update: UpdateClinicRequest = ibinolaToTypedUpdateClinicRequest({ name: "New Name", ignored: true });
    expect(update).toEqual({ name: "New Name" });
    expect(() => ibinolaToTypedCreateClinicRequest({ name: "" })).toThrow("CLINIC_INVALID_INPUT");
  });
});
