import { describe, expect, it } from "vitest";
import path from "node:path";
import { findRepoRoot, missingEnvWarning, resolveEnvFile, type EnvFileFs } from "../env-file.js";

/** Fake file system: a map of absolute path -> contents. */
function fakeFs(files: Record<string, string>): EnvFileFs {
  return {
    exists: (file) => file in files,
    read: (file) => files[file] ?? "",
  };
}

const root = path.resolve("/repo");
const files = {
  [path.join(root, "package.json")]: JSON.stringify({ workspaces: ["apps/*", "packages/*"] }),
  [path.join(root, "packages/config/package.json")]: JSON.stringify({ name: "@lumen/config" }),
  [path.join(root, ".env")]: "JWT_SECRET=x",
};

describe("findRepoRoot", () => {
  it("finds the workspace root from the source layout", () => {
    expect(findRepoRoot(path.join(root, "packages/config"), fakeFs(files))).toBe(root);
  });

  it("finds the same root from the compiled dist layout", () => {
    expect(findRepoRoot(path.join(root, "packages/config/dist"), fakeFs(files))).toBe(root);
  });

  it("returns null when no workspace package.json exists", () => {
    expect(findRepoRoot(path.join(root, "packages/config"), fakeFs({}))).toBeNull();
  });

  it("skips an unparsable package.json", () => {
    const broken = { ...files, [path.join(root, "packages/config/package.json")]: "{" };
    expect(findRepoRoot(path.join(root, "packages/config/dist"), fakeFs(broken))).toBe(root);
  });
});

describe("resolveEnvFile", () => {
  it("points at <root>/.env from both layouts", () => {
    const io = fakeFs(files);
    const expected = path.join(root, ".env");
    expect(resolveEnvFile(path.join(root, "packages/config"), {}, io).path).toBe(expected);
    expect(resolveEnvFile(path.join(root, "packages/config/dist"), {}, io).path).toBe(expected);
  });

  it("prefers LUMEN_ENV_FILE", () => {
    const resolved = resolveEnvFile(path.join(root, "packages/config"), { LUMEN_ENV_FILE: "/etc/lumen.env" }, fakeFs(files));
    expect(resolved).toEqual({ path: path.resolve("/etc/lumen.env"), source: "override" });
  });
});

describe("missingEnvWarning", () => {
  const io = fakeFs(files);

  it("is silent when the file exists", () => {
    expect(missingEnvWarning({ path: path.join(root, ".env") }, {}, io)).toBeNull();
  });

  it("is silent in production even when the file is missing", () => {
    expect(missingEnvWarning({ path: "/nowhere/.env" }, { NODE_ENV: "production" }, io)).toBeNull();
  });

  it("prints one warning line in development", () => {
    const warning = missingEnvWarning({ path: "/nowhere/.env" }, { NODE_ENV: "development" }, io);
    expect(warning).toContain("/nowhere/.env");
    expect(warning).not.toContain("\n");
  });
});
