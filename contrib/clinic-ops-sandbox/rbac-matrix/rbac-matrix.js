#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const matrixPath = path.join(__dirname, "matrix.json");

function loadMatrix() {
  const raw = fs.readFileSync(matrixPath, "utf8");
  return JSON.parse(raw);
}

function normalizeInput(value) {
  return typeof value === "string" ? value.trim() : "";
}

function can(role, action, matrix = loadMatrix()) {
  const normalizedRole = normalizeInput(role);
  const normalizedAction = normalizeInput(action);

  if (!matrix.roles.includes(normalizedRole)) {
    return {
      allowed: false,
      reason: "UNKNOWN_ROLE",
      role: normalizedRole,
      action: normalizedAction,
    };
  }

  if (!matrix.actions.includes(normalizedAction)) {
    return {
      allowed: false,
      reason: "UNKNOWN_ACTION",
      role: normalizedRole,
      action: normalizedAction,
    };
  }

  const allowedActions = matrix.permissions[normalizedRole] || [];
  const allowed = allowedActions.includes(normalizedAction);

  return {
    allowed,
    reason: allowed ? "ALLOWED" : "DENIED",
    role: normalizedRole,
    action: normalizedAction,
  };
}

function parseArgs(argv) {
  const roleArg = argv.find((arg) => arg.startsWith("--role="));
  const actionArg = argv.find((arg) => arg.startsWith("--action="));

  return {
    role: roleArg ? roleArg.split("=").slice(1).join("=") : "",
    action: actionArg ? actionArg.split("=").slice(1).join("=") : "",
  };
}

function printUsageAndExit() {
  console.error("Usage: npm run check -- --role=<ROLE> --action=<ACTION>");
  process.exit(1);
}

if (require.main === module) {
  const { role, action } = parseArgs(process.argv.slice(2));
  if (!role || !action) {
    printUsageAndExit();
  }

  const result = can(role, action);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.allowed ? 0 : 2);
}

module.exports = {
  can,
  loadMatrix,
};
