const test = require("node:test");
const assert = require("node:assert/strict");

const { can, loadMatrix } = require("./rbac-matrix");

const matrix = loadMatrix();

test("allows CLINIC_ADMIN to update clinic settings", () => {
  const result = can("CLINIC_ADMIN", "clinic.settings.update", matrix);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "ALLOWED");
});

test("denies NURSE from creating staff", () => {
  const result = can("NURSE", "staff.create", matrix);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "DENIED");
});

test("denies READ_ONLY from updating patients", () => {
  const result = can("READ_ONLY", "patients.update", matrix);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "DENIED");
});

test("returns UNKNOWN_ROLE for invalid role", () => {
  const result = can("INVALID", "patients.read", matrix);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "UNKNOWN_ROLE");
});

test("returns UNKNOWN_ACTION for invalid action", () => {
  const result = can("DOCTOR", "patients.remove", matrix);
  assert.equal(result.allowed, false);
  assert.equal(result.reason, "UNKNOWN_ACTION");
});

test("normalizes input whitespace", () => {
  const result = can("  DOCTOR  ", "  prescriptions.create  ", matrix);
  assert.equal(result.allowed, true);
  assert.equal(result.reason, "ALLOWED");
});
