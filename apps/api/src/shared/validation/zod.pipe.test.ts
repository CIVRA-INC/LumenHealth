import { describe, expect, it } from "vitest";
import { CreateClinicRequestSchema } from "@lumen/types";
import { HttpException } from "@nestjs/common";
import { ZodValidationPipe } from "./zod.pipe.js";

const pipe = new ZodValidationPipe(CreateClinicRequestSchema, "CLINIC_INVALID_INPUT");

describe("ZodValidationPipe", () => {
  it("returns the parsed value for valid input", () => {
    const body = { name: "North Star", address: "1 Main", phone: "555", email: "a@b.co" };
    expect(pipe.transform(body)).toEqual(body);
  });

  it("throws a 400 with the module error code, message and field", () => {
    try {
      pipe.transform({ name: "x", address: "1 Main", phone: "555", email: "a@b.co" });
      throw new Error("expected to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpException);
      const e = err as HttpException;
      expect(e.getStatus()).toBe(400);
      expect(e.getResponse()).toMatchObject({
        error: "CLINIC_INVALID_INPUT",
        message: "name must be at least 2 characters",
        field: "name",
      });
    }
  });
});
