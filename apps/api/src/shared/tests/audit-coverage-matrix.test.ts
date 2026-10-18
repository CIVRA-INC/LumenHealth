import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Gate for docs/audit-coverage-matrix.md (#1324).
 *
 * Scans every mutating route (`@Post`/`@Put`/`@Patch`/`@Delete`) declared in
 * `apps/api/src/modules/**` and reconciles it against the matrix table:
 *
 *  - a controller route with no matrix row fails (a new mutating endpoint
 *    shipped without an audit decision);
 *  - a matrix row with no matching route fails (stale documentation);
 *  - rows must name a valid `AuditAction` (or `none`) and a valid status;
 *  - `covered` rows must have a `recordAudit` call for their action in
 *    their module's source.
 *
 * This is a source scan on purpose: it must run green or red regardless of
 * whether a controller module currently imports cleanly.
 */

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const modulesRoot = join(repoRoot, "apps", "api", "src", "modules");
const matrixPath = join(repoRoot, "docs", "audit-coverage-matrix.md");
const typesAuditPath = join(repoRoot, "packages", "types", "src", "audit.ts");

type ScannedRoute = {
  file: string;
  mount: string;
  verb: string;
  path: string;
  handler: string;
};

type MatrixRow = {
  file: string;
  mount: string;
  verb: string;
  path: string;
  handler: string;
  action: string;
  status: string;
  notes: string;
};

const KEY_SEP = " ";

function routeKey(file: string, mount: string, verb: string, path: string): string {
  return [file, mount, verb, path].join(KEY_SEP);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function scanMutatingRoutes(): ScannedRoute[] {
  const routes: ScannedRoute[] = [];
  const files = walk(modulesRoot)
    .filter((f) => f.endsWith(".controller.ts") && !f.includes(".test."))
    .sort();

  for (const abs of files) {
    const src = readFileSync(abs, "utf8");
    const lines = src.split("\n");
    const relFile = toPosix(relative(repoRoot, abs));
    const mountMatch = src.match(/@Controller\(\s*['"`]([^'"`]*)['"`]/);
    const rawMount = mountMatch ? mountMatch[1] : "";
    const mount = rawMount === "" ? "/" : `/${rawMount}`;

    for (let i = 0; i < lines.length; i++) {
      const decorator =
        lines[i].match(/@(Post|Put|Patch|Delete)\(\s*['"`]([^'"`]*)['"`]\s*\)/) ??
        lines[i].match(/@(Post|Put|Patch|Delete)\(\s*\)/);
      if (!decorator) continue;

      const verb = decorator[1].toUpperCase();
      const rawPath = decorator[2] === undefined ? "" : decorator[2];
      const path = rawPath === "" ? "<root>" : rawPath;

      // First un-decorated, parenthesised identifier after the decorator is
      // the handler name (Nest keeps method and decorator at one indent).
      let handler = "";
      for (let j = i + 1; j < Math.min(i + 14, lines.length); j++) {
        const line = lines[j];
        if (/^\s*@/.test(line)) continue;
        const method = line.match(
          /^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(/
        );
        if (method) {
          handler = method[1];
          break;
        }
      }

      routes.push({ file: relFile, mount, verb, path, handler });
    }
  }
  return routes;
}

function parseMatrix(): MatrixRow[] {
  const text = readFileSync(matrixPath, "utf8");
  const rows: MatrixRow[] = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .slice(1, line.endsWith("|") ? line.length - 1 : line.length)
      .split("|")
      .map((c) => c.trim());
    if (cells.length === 0) continue;
    // Skip the header row and the --- separator row.
    if (cells[0] === "File") continue;
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (cells.length !== 8) {
      throw new Error(`matrix row does not have 8 columns: ${line}`);
    }
    rows.push({
      file: cells[0],
      mount: cells[1],
      verb: cells[2].toUpperCase(),
      path: cells[3],
      handler: cells[4],
      action: cells[5],
      status: cells[6],
      notes: cells[7],
    });
  }
  return rows;
}

function declaredAuditActions(): string[] {
  const src = readFileSync(typesAuditPath, "utf8");
  const union = src.match(/export type AuditAction =([\s\S]*?);/);
  if (!union) {
    throw new Error("could not locate the AuditAction union in packages/types/src/audit.ts");
  }
  const actions: string[] = [];
  const quoted = /"([^"]+)"/g;
  let match: RegExpExecArray | null;
  while ((match = quoted.exec(union[1])) !== null) actions.push(match[1]);
  return actions;
}

function moduleSource(relFile: string): string {
  const parts = toPosix(relFile).split("/");
  const modulesIdx = parts.lastIndexOf("modules");
  const moduleDir = join(modulesRoot, parts[modulesIdx + 1]);
  return walk(moduleDir)
    .filter((f) => !f.includes(".test.") && f.endsWith(".ts"))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
}

describe("audit coverage matrix gate", () => {
  const scanned = scanMutatingRoutes();
  const matrix = parseMatrix();
  const scannedByKey = new Map(
    scanned.map((r) => [routeKey(r.file, r.mount, r.verb, r.path), r])
  );
  const matrixByKey = new Map(
    matrix.map((r) => [routeKey(r.file, r.mount, r.verb, r.path), r])
  );

  it("finds the mutating routes it is supposed to guard", () => {
    expect(scanned.length).toBeGreaterThanOrEqual(15);
    expect(matrix.length).toBeGreaterThanOrEqual(15);
  });

  it("every mutating route in a controller has a matrix row", () => {
    const missing = scanned
      .map((r) => routeKey(r.file, r.mount, r.verb, r.path))
      .filter((key) => !matrixByKey.has(key));
    expect(
      missing,
      `routes missing from docs/audit-coverage-matrix.md:\n${missing.join("\n")}`
    ).toEqual([]);
  });

  it("every matrix row matches a real mutating route", () => {
    const stale = matrix
      .map((r) => routeKey(r.file, r.mount, r.verb, r.path))
      .filter((key) => !scannedByKey.has(key));
    expect(stale, `stale rows (route no longer exists):\n${stale.join("\n")}`).toEqual([]);
  });

  it("matrix rows are well-formed: valid verb, status, action and handler", () => {
    const actions = declaredAuditActions();
    expect(actions.length).toBeGreaterThan(10); // union parse guard

    const problems: string[] = [];
    for (const row of matrix) {
      const key = routeKey(row.file, row.mount, row.verb, row.path);
      const scannedRow = scannedByKey.get(key);
      if (!scannedRow) continue; // covered by the staleness test above

      if (!["POST", "PUT", "PATCH", "DELETE"].includes(row.verb)) {
        problems.push(`${key}: invalid verb "${row.verb}"`);
      }
      if (!["covered", "gap", "exempt"].includes(row.status)) {
        problems.push(`${key}: invalid status "${row.status}"`);
      }
      if (row.action !== "none" && !actions.includes(row.action)) {
        problems.push(`${key}: action "${row.action}" is not in the AuditAction union`);
      }
      if (row.handler !== scannedRow.handler) {
        problems.push(
          `${key}: matrix says handler "${row.handler}" but source declares "${scannedRow.handler}"`
        );
      }
      if (row.status !== "covered" && row.notes.length === 0) {
        problems.push(`${key}: status "${row.status}" requires a rationale in Notes`);
      }
      if (row.status === "covered" && row.action === "none") {
        problems.push(`${key}: covered rows must declare an audit action`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("covered rows have a recordAudit call for their action in their module", () => {
    const problems: string[] = [];
    for (const row of matrix) {
      if (row.status !== "covered") continue;
      const src = moduleSource(row.file);
      if (!src.includes("recordAudit")) {
        problems.push(`${row.file}: no recordAudit call in its module source`);
      }
      if (!src.includes(`"${row.action}"`) && !src.includes(`'${row.action}'`)) {
        problems.push(`${row.file}: action "${row.action}" never appears in its module source`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
