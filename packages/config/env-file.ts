import fs from "node:fs";
import path from "node:path";

export type EnvFileFs = {
  exists: (file: string) => boolean;
  read: (file: string) => string;
};

const realFs: EnvFileFs = {
  exists: (file) => fs.existsSync(file),
  read: (file) => fs.readFileSync(file, "utf8"),
};

/**
 * Walks up from `startDir` to the first directory whose `package.json` has a
 * `workspaces` field — the monorepo root. Works the same from `packages/config`
 * (source) and `packages/config/dist` (compiled output). Returns `null` when no
 * such directory exists.
 */
export function findRepoRoot(startDir: string, io: EnvFileFs = realFs): string | null {
  let dir = path.resolve(startDir);
  for (;;) {
    const manifest = path.join(dir, "package.json");
    if (io.exists(manifest)) {
      try {
        const parsed = JSON.parse(io.read(manifest)) as { workspaces?: unknown };
        if (parsed.workspaces) return dir;
      } catch {
        // An unreadable package.json is not the root; keep walking.
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Resolves the `.env` file to load: an explicit `LUMEN_ENV_FILE` override wins,
 * otherwise `<repo root>/.env`. `path` is `null` when neither can be determined.
 */
export function resolveEnvFile(
  startDir: string,
  env: Record<string, string | undefined> = process.env,
  io: EnvFileFs = realFs,
): { path: string | null; source: "override" | "repo-root" | "none" } {
  const override = env.LUMEN_ENV_FILE?.trim();
  if (override) return { path: path.resolve(override), source: "override" };

  const root = findRepoRoot(startDir, io);
  return root ? { path: path.join(root, ".env"), source: "repo-root" } : { path: null, source: "none" };
}

/** One warning line (no values) when no `.env` is found outside production; otherwise `null`. */
export function missingEnvWarning(
  resolved: { path: string | null },
  env: Record<string, string | undefined> = process.env,
  io: EnvFileFs = realFs,
): string | null {
  if (env.NODE_ENV === "production") return null;
  if (resolved.path && io.exists(resolved.path)) return null;
  return `[config] no .env file found${resolved.path ? ` at ${resolved.path}` : ""}; using process environment and defaults (set LUMEN_ENV_FILE to override)`;
}
