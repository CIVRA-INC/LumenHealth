#!/usr/bin/env node
// Fails when an environment variable read in packages/config/index.ts is missing from the
// table in apps/api/README.md. Run via `npm run check:env-docs`.
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(__dirname, "index.ts"), "utf8");
const readme = fs.readFileSync(path.join(root, "apps/api/README.md"), "utf8");

// Matches read("NAME"...), readInt("NAME"...) and similar `read*` helpers.
const variables = [...new Set([...source.matchAll(/\bread\w*\(\s*["']([A-Z][A-Z0-9_]*)["']/g)].map((m) => m[1]))];
const documented = new Set([...readme.matchAll(/\|\s*`([A-Z][A-Z0-9_]*)`/g)].map((m) => m[1]));

const missing = variables.filter((name) => !documented.has(name));
if (missing.length > 0) {
  console.error(`apps/api/README.md does not document: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`env docs ok (${variables.length} variables documented)`);
