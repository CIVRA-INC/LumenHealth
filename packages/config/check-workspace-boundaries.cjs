const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const appRoot = path.join(root, "apps");
const importPattern = /from\s+['"](\.\.\/)+apps\/|require\(['"](\.\.\/)+apps\//;

const files = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
};

if (fs.existsSync(appRoot)) {
  walk(appRoot);
}

const offenders = files.filter((file) => importPattern.test(fs.readFileSync(file, "utf8")));

if (offenders.length > 0) {
  console.error("Cross-app imports detected:");
  offenders.forEach((file) => console.error(`- ${path.relative(root, file)}`));
  process.exit(1);
}

console.log("Workspace boundary check passed.");
