#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

const blacklistPath = path.join(__dirname, "common-passwords.json");
const blacklist = new Set(
  JSON.parse(fs.readFileSync(blacklistPath, "utf8")).map((p) => p.toLowerCase()),
);

function hasUppercase(input) {
  return /[A-Z]/.test(input);
}

function hasLowercase(input) {
  return /[a-z]/.test(input);
}

function hasNumber(input) {
  return /\d/.test(input);
}

function hasSymbol(input) {
  return /[^A-Za-z0-9]/.test(input);
}

function validatePassword(password) {
  const issues = [];
  const value = typeof password === "string" ? password : "";

  if (value.length < MIN_LENGTH) {
    issues.push("Password must be at least 8 characters long.");
  }

  if (value.length > MAX_LENGTH) {
    issues.push("Password must be at most 128 characters long.");
  }

  if (!hasUppercase(value)) {
    issues.push("Password must include at least one uppercase letter.");
  }

  if (!hasLowercase(value)) {
    issues.push("Password must include at least one lowercase letter.");
  }

  if (!hasNumber(value)) {
    issues.push("Password must include at least one number.");
  }

  if (!hasSymbol(value)) {
    issues.push("Password must include at least one symbol.");
  }

  if (blacklist.has(value.toLowerCase())) {
    issues.push("Password is too common and is not allowed.");
  }

  const hasMinLength = value.length >= MIN_LENGTH && value.length <= MAX_LENGTH;
  const passedChecks = [
    hasMinLength,
    hasUppercase(value),
    hasLowercase(value),
    hasNumber(value),
    hasSymbol(value),
    !blacklist.has(value.toLowerCase()),
  ].filter(Boolean).length;

  let score = 0;
  if (passedChecks <= 1) {
    score = 0;
  } else if (passedChecks <= 2) {
    score = 1;
  } else if (passedChecks <= 3) {
    score = 2;
  } else if (passedChecks <= 4) {
    score = 3;
  } else {
    score = 4;
  }

  return {
    valid: issues.length === 0,
    score,
    issues,
    checks: {
      minLength: hasMinLength,
      uppercase: hasUppercase(value),
      lowercase: hasLowercase(value),
      number: hasNumber(value),
      symbol: hasSymbol(value),
      blacklist: !blacklist.has(value.toLowerCase()),
    },
  };
}

function parsePasswordArg(argv) {
  const arg = argv.find((value) => value.startsWith("--password="));
  return arg ? arg.split("=").slice(1).join("=") : "";
}

function printUsageAndExit() {
  console.error("Usage: npm run lint -- --password=<password>");
  process.exit(1);
}

if (require.main === module) {
  const password = parsePasswordArg(process.argv.slice(2));
  if (!password) {
    printUsageAndExit();
  }

  const result = validatePassword(password);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.valid ? 0 : 2);
}

module.exports = {
  validatePassword,
};
