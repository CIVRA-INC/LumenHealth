import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * CI gate for inline script regressions (#1344).
 *
 * The CSP this app ships has a nonce-only `script-src` with no
 * 'unsafe-inline' — any literal inline <script> block in our own markup
 * would be blocked at runtime (or silently rely on a nonce we can't prove).
 * This test fails the build when one is introduced, which is the
 * "CI check that fails on inline script regressions" the issue asks for:
 * it runs as part of `npm test` in CI.
 */

const APP_DIR = path.resolve(__dirname, "../app");

function collectTsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectTsxFiles(full));
    else if (/\.(tsx|ts|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("CSP inline script regression check", () => {
  const files = collectTsxFiles(APP_DIR);

  it("scans the app directory (sanity: found source files)", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("contains no literal inline <script> blocks in app source", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      // Matches `<script ...>...</script>` where the element is not
      // self-closing and not an empty pair — i.e. actual inline content.
      if (/<script(\s[^>]*)?>[\s\S]*?<\/script>/i.test(source)) {
        offenders.push(path.relative(path.resolve(__dirname, ".."), file));
      }
    }
    expect(offenders).toEqual([]);
  });
  // Note: JSX onClick={...} handlers are fine under this CSP — React
  // compiles them into synthetic event listeners attached from script, not
  // into HTML on* attributes, so nonce-only script-src does not block them.
});
