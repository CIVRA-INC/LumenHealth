const test = require("node:test");
const assert = require("node:assert/strict");

const { validateMemoFormat, compareMemo } = require("./memo-guard");

const validLowerHex = "a".repeat(64);
const validUpperHex = "A".repeat(64);

test("rejects malformed memo with clear reason", () => {
  const result = validateMemoFormat("xyz");
  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.includes("Memo must be exactly 64 hex characters."),
  );
  assert.ok(
    result.diagnostics.includes(
      "Memo must contain only hexadecimal characters (0-9, a-f).",
    ),
  );
});

test("rejects memo with whitespace and reports diagnostic", () => {
  const result = validateMemoFormat(` ${validLowerHex} `);
  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.includes("Memo has leading or trailing whitespace."),
  );
});

test("matches identical memo in case-sensitive mode", () => {
  const result = compareMemo(validLowerHex, validLowerHex, { caseSensitive: true });
  assert.equal(result.credited, true);
  assert.equal(result.reason, "MATCH");
});

test("fails when only case differs in case-sensitive mode", () => {
  const result = compareMemo(validLowerHex, validUpperHex, { caseSensitive: true });
  assert.equal(result.credited, false);
  assert.equal(result.reason, "MEMO_MISMATCH");
  assert.ok(
    result.diagnostics.includes(
      "Memo differs only by letter casing (case-sensitive mode enabled).",
    ),
  );
});

test("passes when only case differs in case-insensitive mode", () => {
  const result = compareMemo(validLowerHex, validUpperHex, { caseSensitive: false });
  assert.equal(result.credited, true);
  assert.equal(result.reason, "MATCH");
});

test("fails when value mismatch exists regardless of case mode", () => {
  const submitted = "b".repeat(64);
  const result = compareMemo(validLowerHex, submitted, { caseSensitive: false });
  assert.equal(result.credited, false);
  assert.equal(result.reason, "MEMO_MISMATCH");
});
