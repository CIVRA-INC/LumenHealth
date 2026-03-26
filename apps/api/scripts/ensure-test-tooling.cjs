const fs = require("fs");
const path = require("path");

const vitestBinary = path.resolve(__dirname, "../node_modules/.bin/vitest");

if (fs.existsSync(vitestBinary)) {
  process.exit(0);
}

console.error(
  [
    "Vitest is not installed for apps/api.",
    "Run `npm install` at the repository root before running `npm test -w apps/api`.",
  ].join("\n"),
);

process.exit(1);
