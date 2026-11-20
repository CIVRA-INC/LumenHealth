// Fails when a relative link in README.md, CONTRIBUTING.md or docs/**/*.md points at a missing file.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const roots = ["README.md", "CONTRIBUTING.md", "CONTRACT_VERSIONING.md", "SECURITY.md"].filter(existsSync);

function collect(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? collect(path) : path.endsWith(".md") ? [path] : [];
  });
}
const files = [...roots, ...(existsSync("docs") ? collect("docs") : [])];

const linkPattern = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
let failed = 0;

for (const file of files) {
  const text = readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const match of text.matchAll(linkPattern)) {
    const target = match[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
    const path = target.split("#")[0];
    if (!path) continue;
    if (!existsSync(resolve(dirname(file), path))) {
      console.error(`${file}: broken link -> ${target}`);
      failed++;
    }
  }
}

if (failed > 0) {
  console.error(`check-markdown-links: ${failed} broken link(s)`);
  process.exit(1);
}
console.log(`check-markdown-links: OK (${files.length} files)`);
