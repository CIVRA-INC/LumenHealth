import { describe, expect, it } from "vitest";
import { mxllvBuildPatientDetailParams, mxllvRouteRequiresAuth } from "./mxllv-typed-route-param-lists";

describe("mxllv typed route param lists", () => {
  it("identifies auth requirements for root routes", () => {
    expect(mxllvRouteRequiresAuth("Main")).toBe(true);
    expect(mxllvRouteRequiresAuth("Auth")).toBe(false);
  });

  it("builds typed params and validates required ids", () => {
    expect(mxllvBuildPatientDetailParams("p1")).toEqual({ patientId: "p1" });
    expect(() => mxllvBuildPatientDetailParams("")).toThrow("patientId is required");
  });
});
