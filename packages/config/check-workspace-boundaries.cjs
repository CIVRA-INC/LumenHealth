#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const boundaryDefinitions = [
  {
    workspace: '@lumen/api',
    path: 'apps/api',
    canImport: ['@lumen/config', '@lumen/types'],
  },
  {
    workspace: '@lumen/web',
    path: 'apps/web',
    canImport: ['@lumen/config', '@lumen/types'],
  },
  {
    workspace: '@lumen/stellar',
    path: 'apps/stellar-service',
    canImport: ['@lumen/config'],
  },
  {
    workspace: '@lumen/config',
    path: 'packages/config',
    canImport: [],
  },
  {
    workspace: '@lumen/types',
    path: 'packages/types',
    canImport: [],
  },
];

const fixtureMode = process.argv.includes('--fixtures');
const fixtureRoot = path.join(__dirname, 'fixtures');
const importPattern =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]+from\s+)?["']([^"']+)["']|\brequire\(\s*["']([^"']+)["']\s*\)/g;

function collectFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const next = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        ['node_modules', 'dist', '.next', '.turbo', '.git'].includes(entry.name) ||
        (!fixtureMode && entry.name === 'fixtures')
      ) {
        return [];
      }
      return collectFiles(next);
    }

    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      return [];
    }

    return [next];
  });
}

function getBoundaryForFile(file) {
  const relative = path.relative(root, file).replace(/\\/g, '/');
  return boundaryDefinitions.find((boundary) => relative.startsWith(`${boundary.path}/`)) || null;
}

function resolveViolation(file, specifier) {
  const boundary = getBoundaryForFile(file);
  if (!boundary) {
    return null;
  }

  if (specifier.startsWith('apps/') || specifier.startsWith('packages/')) {
    return {
      file,
      specifier,
      message: 'Cross-workspace root-relative imports are not allowed.',
    };
  }

  if (specifier.startsWith('@lumen/')) {
    if (specifier === boundary.workspace || boundary.canImport.includes(specifier)) {
      return null;
    }

    return {
      file,
      specifier,
      message: `${boundary.workspace} cannot import ${specifier}. Allowed shared packages: ${
        boundary.canImport.join(', ') || 'none'
      }.`,
    };
  }

  if (specifier.startsWith('..')) {
    const originDir = path.dirname(file);
    const resolved = path.resolve(originDir, specifier);
    const resolvedBoundary = getBoundaryForFile(resolved);
    if (resolvedBoundary && resolvedBoundary.path !== boundary.path) {
      return {
        file,
        specifier,
        message: `Relative import escapes ${boundary.path} into ${resolvedBoundary.path}.`,
      };
    }
  }

  return null;
}

function scan(files) {
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(importPattern)) {
      const specifier = match[1] || match[2];
      if (!specifier) {
        continue;
      }

      const violation = resolveViolation(file, specifier);
      if (violation) {
        violations.push(violation);
      }
    }
  }

  return violations;
}

const roots = fixtureMode
  ? [fixtureRoot]
  : boundaryDefinitions.map((boundary) => path.join(root, boundary.path));

const files = roots.flatMap((dir) => collectFiles(dir));
const violations = scan(files);

if (fixtureMode) {
  if (violations.length === 0) {
    console.error('Expected the fixture scan to report at least one boundary violation.');
    process.exit(1);
  }

  console.log(`Fixture check surfaced ${violations.length} expected boundary violation(s).`);
  for (const violation of violations) {
    console.log(`- ${path.relative(root, violation.file)} :: ${violation.specifier}`);
  }
  process.exit(0);
}

if (violations.length > 0) {
  console.error(`Workspace boundary check failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(`- ${path.relative(root, violation.file)} :: ${violation.specifier}`);
    console.error(`  ${violation.message}`);
  }
  process.exit(1);
}

console.log('Workspace boundary check passed.');
