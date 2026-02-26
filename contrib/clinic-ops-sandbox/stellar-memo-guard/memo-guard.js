#!/usr/bin/env node

const MEMO_HEX_LENGTH = 64;
const MEMO_HEX_REGEX = /^[a-f0-9]+$/;

function parseArgs(argv) {
  const expectedArg = argv.find((arg) => arg.startsWith("--expected="));
  const submittedArg = argv.find((arg) => arg.startsWith("--submitted="));
  const caseSensitiveArg = argv.find((arg) => arg.startsWith("--case-sensitive="));

  return {
    expected: expectedArg ? expectedArg.split("=").slice(1).join("=") : "",
    submitted: submittedArg ? submittedArg.split("=").slice(1).join("=") : "",
    caseSensitive: caseSensitiveArg
      ? caseSensitiveArg.split("=").slice(1).join("=") !== "false"
      : true,
  };
}

function validateMemoFormat(memo) {
  const raw = typeof memo === "string" ? memo : "";
  const trimmed = raw.trim();
  const diagnostics = [];

  if (raw !== trimmed) {
    diagnostics.push("Memo has leading or trailing whitespace.");
  }

  if (trimmed.length !== MEMO_HEX_LENGTH) {
    diagnostics.push(`Memo must be exactly ${MEMO_HEX_LENGTH} hex characters.`);
  }

  if (!MEMO_HEX_REGEX.test(trimmed.toLowerCase())) {
    diagnostics.push("Memo must contain only hexadecimal characters (0-9, a-f).");
  }

  return {
    valid: diagnostics.length === 0,
    normalized: trimmed,
    diagnostics,
  };
}

function compareMemo(expectedMemo, submittedMemo, options = { caseSensitive: true }) {
  const expected = validateMemoFormat(expectedMemo);
  const submitted = validateMemoFormat(submittedMemo);

  if (!expected.valid || !submitted.valid) {
    return {
      credited: false,
      reason: "INVALID_MEMO_FORMAT",
      expected,
      submitted,
      diagnostics: [
        ...expected.diagnostics.map((d) => `Expected memo: ${d}`),
        ...submitted.diagnostics.map((d) => `Submitted memo: ${d}`),
      ],
    };
  }

  const normalizedExpected = options.caseSensitive
    ? expected.normalized
    : expected.normalized.toLowerCase();
  const normalizedSubmitted = options.caseSensitive
    ? submitted.normalized
    : submitted.normalized.toLowerCase();

  if (normalizedExpected !== normalizedSubmitted) {
    const diagnostics = [];

    if (
      expected.normalized.toLowerCase() === submitted.normalized.toLowerCase() &&
      options.caseSensitive
    ) {
      diagnostics.push("Memo differs only by letter casing (case-sensitive mode enabled).");
    } else {
      diagnostics.push("Memo value does not match expected payment reference.");
    }

    return {
      credited: false,
      reason: "MEMO_MISMATCH",
      expected,
      submitted,
      diagnostics,
    };
  }

  return {
    credited: true,
    reason: "MATCH",
    expected,
    submitted,
    diagnostics: ["Memo matches expected payment reference."],
  };
}

function printUsageAndExit() {
  console.error(
    "Usage: npm run check -- --expected=<memo> --submitted=<memo> [--case-sensitive=true|false]",
  );
  process.exit(1);
}

if (require.main === module) {
  const { expected, submitted, caseSensitive } = parseArgs(process.argv.slice(2));

  if (!expected || !submitted) {
    printUsageAndExit();
  }

  const result = compareMemo(expected, submitted, { caseSensitive });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.credited ? 0 : 2);
}

module.exports = {
  validateMemoFormat,
  compareMemo,
};
