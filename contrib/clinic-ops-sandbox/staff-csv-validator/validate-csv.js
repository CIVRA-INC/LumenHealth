#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const REQUIRED_HEADERS = ["name", "email", "role", "isActive"];
const ROLE_SET = new Set([
  "SUPER_ADMIN",
  "CLINIC_ADMIN",
  "DOCTOR",
  "NURSE",
  "ASSISTANT",
  "READ_ONLY",
]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseArgs(argv) {
  const inputArg = argv.find((arg) => arg.startsWith("--input="));
  const outputArg = argv.find((arg) => arg.startsWith("--output="));

  return {
    input: inputArg ? inputArg.split("=").slice(1).join("=") : "",
    output: outputArg ? outputArg.split("=").slice(1).join("=") : "",
  };
}

function splitCsvLine(line) {
  return line.split(",").map((value) => value.trim());
}

function validateRow(row, lineNumber, seenEmails) {
  const reasons = [];

  if (!row.name) {
    reasons.push("Name is required");
  }

  if (!row.email || !EMAIL_REGEX.test(row.email)) {
    reasons.push("Email is invalid");
  }

  if (!row.role || !ROLE_SET.has(row.role)) {
    reasons.push("Role is invalid");
  }

  if (!(row.isActive === "true" || row.isActive === "false")) {
    reasons.push("isActive must be true or false");
  }

  const normalizedEmail = row.email.toLowerCase();
  if (seenEmails.has(normalizedEmail)) {
    reasons.push("Duplicate email in file");
  }

  if (row.email) {
    seenEmails.add(normalizedEmail);
  }

  if (reasons.length > 0) {
    return {
      valid: false,
      line: lineNumber,
      row,
      reasons,
    };
  }

  return {
    valid: true,
    line: lineNumber,
    row: {
      ...row,
      isActive: row.isActive === "true",
    },
  };
}

function validateCsv(csvContent) {
  const lines = csvContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new Error("CSV is empty");
  }

  const headers = splitCsvLine(lines[0]);
  const headerMismatch =
    headers.length !== REQUIRED_HEADERS.length ||
    REQUIRED_HEADERS.some((header, index) => headers[index] !== header);

  if (headerMismatch) {
    throw new Error(
      `Invalid CSV headers. Expected: ${REQUIRED_HEADERS.join(",")}`,
    );
  }

  const seenEmails = new Set();
  const validRows = [];
  const invalidRows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const lineNumber = i + 1;
    const values = splitCsvLine(lines[i]);

    if (values.length !== REQUIRED_HEADERS.length) {
      invalidRows.push({
        line: lineNumber,
        row: {
          raw: lines[i],
        },
        reasons: ["Column count mismatch"],
      });
      continue;
    }

    const row = {
      name: values[0],
      email: values[1],
      role: values[2],
      isActive: values[3],
    };

    const result = validateRow(row, lineNumber, seenEmails);
    if (result.valid) {
      validRows.push({
        line: result.line,
        row: result.row,
      });
    } else {
      invalidRows.push({
        line: result.line,
        row: result.row,
        reasons: result.reasons,
      });
    }
  }

  return {
    validRows,
    invalidRows,
    summary: {
      totalRows: lines.length - 1,
      validCount: validRows.length,
      invalidCount: invalidRows.length,
    },
  };
}

(function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  if (!input || !output) {
    console.error(
      "Usage: npm run validate -- --input=sample-staff.csv --output=report.json",
    );
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), input);
  const outputPath = path.resolve(process.cwd(), output);

  try {
    const csvContent = fs.readFileSync(inputPath, "utf8");
    const report = validateCsv(csvContent);
    fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

    console.log(
      JSON.stringify(
        {
          status: "ok",
          output: outputPath,
          summary: report.summary,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          status: "error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }
})();

module.exports = {
  validateCsv,
};
