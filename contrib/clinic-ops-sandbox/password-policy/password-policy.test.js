const test = require("node:test");
const assert = require("node:assert/strict");

const { validatePassword } = require("./password-policy");

test("rejects a common blacklisted password", () => {
  const result = validatePassword("password123");
  assert.equal(result.valid, false);
  assert.equal(result.checks.blacklist, false);
  assert.ok(result.issues.includes("Password is too common and is not allowed."));
});

test("rejects missing uppercase, number, and symbol", () => {
  const result = validatePassword("lowercaseonly");
  assert.equal(result.valid, false);
  assert.equal(result.checks.uppercase, false);
  assert.equal(result.checks.number, false);
  assert.equal(result.checks.symbol, false);
});

test("rejects too-short password", () => {
  const result = validatePassword("Ab1!");
  assert.equal(result.valid, false);
  assert.equal(result.checks.minLength, false);
  assert.ok(result.issues.includes("Password must be at least 8 characters long."));
});

test("accepts strong password and returns top score", () => {
  const result = validatePassword("Clin!cSecure2026");
  assert.equal(result.valid, true);
  assert.equal(result.score, 4);
  assert.equal(result.issues.length, 0);
});

test("is deterministic for same input", () => {
  const a = validatePassword("Deterministic1!");
  const b = validatePassword("Deterministic1!");
  assert.deepEqual(a, b);
});

test("handles non-string input safely", () => {
  const result = validatePassword(null);
  assert.equal(result.valid, false);
  assert.equal(result.score, 0);
});
