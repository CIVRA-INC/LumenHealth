// Fails when a shared contract changed without a changelog entry or without a
// classification in the PR body. Env: BASE_REF (default origin/develop),
// PR_BODY (optional; when set, the classification checkboxes are checked).
import { execSync } from "node:child_process";

const base = process.env.BASE_REF ?? "origin/develop";
const changed = execSync(`git diff --name-only ${base}...HEAD`, { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const isContract = (file) =>
  (file.startsWith("packages/types/src/") &&
    !file.includes("/__tests__/") &&
    !file.endsWith(".test.ts")) ||
  file === "packages/config/public.ts";
const isChangelog = (file) =>
  file.startsWith("contracts/") && file.endsWith(".md") && file !== "contracts/README.md";

const contractChanges = changed.filter(isContract);
if (contractChanges.length === 0) {
  console.log("check-contracts: no shared contract files changed.");
  process.exit(0);
}

const problems = [];
if (!changed.some(isChangelog)) {
  problems.push(
    "shared contract files changed but no changelog entry was added under contracts/ " +
      "(copy CONTRACT_CHANGELOG_TEMPLATE.md)",
  );
}

const body = process.env.PR_BODY;
if (body !== undefined) {
  const classified = [
    "Additive contract change",
    "Compatibility-sensitive contract change",
    "Breaking contract change",
  ].some((label) => new RegExp(`\\[[xX]\\]\\s*${label}`).test(body));
  if (!classified) {
    problems.push(
      'the PR body has no checked contract classification (tick "Additive", "Compatibility-sensitive" or "Breaking")',
    );
  }
}

if (problems.length > 0) {
  console.error("check-contracts: FAILED for:\n  " + contractChanges.join("\n  "));
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}
console.log("check-contracts: OK");
