#!/usr/bin/env node

const crypto = require("crypto");

const REQUIRED_CLAIMS = ["userId", "role", "clinicId", "exp"];

function toBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function parseArgs(argv) {
  const token = argv.find((arg) => !arg.startsWith("--"));
  const secretArg = argv.find((arg) => arg.startsWith("--secret="));

  return {
    token,
    secret: secretArg ? secretArg.split("=").slice(1).join("=") : null,
  };
}

function parseToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Token must have exactly 3 parts");
  }

  let header;
  let payload;

  try {
    header = JSON.parse(fromBase64Url(parts[0]));
  } catch {
    throw new Error("Invalid JWT header encoding");
  }

  try {
    payload = JSON.parse(fromBase64Url(parts[1]));
  } catch {
    throw new Error("Invalid JWT payload encoding");
  }

  return {
    header,
    payload,
    signature: parts[2],
    signingInput: `${parts[0]}.${parts[1]}`,
  };
}

function verifySignature(parsedToken, secret) {
  if (!secret) {
    return {
      checked: false,
      valid: null,
      algorithm: parsedToken.header && parsedToken.header.alg,
      reason: "Signature not checked (no secret provided)",
    };
  }

  const algorithm = parsedToken.header && parsedToken.header.alg;

  if (algorithm !== "HS256") {
    return {
      checked: true,
      valid: false,
      algorithm,
      reason: "Only HS256 verification is supported",
    };
  }

  const expectedSignature = toBase64Url(
    crypto
      .createHmac("sha256", secret)
      .update(parsedToken.signingInput)
      .digest(),
  );

  const isValid = crypto.timingSafeEqual(
    Buffer.from(parsedToken.signature),
    Buffer.from(expectedSignature),
  );

  return {
    checked: true,
    valid: isValid,
    algorithm,
    reason: isValid ? "Signature verified" : "Signature mismatch",
  };
}

function validateClaims(payload) {
  const missingClaims = REQUIRED_CLAIMS.filter(
    (claim) => payload[claim] === undefined || payload[claim] === null,
  );

  const typeIssues = [];

  if (payload.userId !== undefined && typeof payload.userId !== "string") {
    typeIssues.push({ field: "userId", expected: "string", actual: typeof payload.userId });
  }

  if (payload.role !== undefined && typeof payload.role !== "string") {
    typeIssues.push({ field: "role", expected: "string", actual: typeof payload.role });
  }

  if (payload.clinicId !== undefined && typeof payload.clinicId !== "string") {
    typeIssues.push({ field: "clinicId", expected: "string", actual: typeof payload.clinicId });
  }

  if (payload.exp !== undefined && typeof payload.exp !== "number") {
    typeIssues.push({ field: "exp", expected: "number", actual: typeof payload.exp });
  }

  return {
    requiredClaims: REQUIRED_CLAIMS,
    missingClaims,
    typeIssues,
    valid: missingClaims.length === 0 && typeIssues.length === 0,
  };
}

function printUsageAndExit() {
  console.error("Usage: npm run inspect -- <jwt> [--secret=your-secret]");
  process.exit(1);
}

(function main() {
  const { token, secret } = parseArgs(process.argv.slice(2));

  if (!token) {
    printUsageAndExit();
  }

  try {
    const parsed = parseToken(token);
    const claimValidation = validateClaims(parsed.payload);
    const signature = verifySignature(parsed, secret);

    const output = {
      success: true,
      header: parsed.header,
      payload: parsed.payload,
      claimValidation,
      signature,
    };

    console.log(JSON.stringify(output, null, 2));
  } catch (error) {
    console.log(
      JSON.stringify(
        {
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: error instanceof Error ? error.message : "Unknown token error",
          },
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
})();
