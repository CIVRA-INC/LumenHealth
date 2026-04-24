#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');

function run(command, args) {
  return spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
}

function fail(message, output = '') {
  if (output) {
    console.error(output.trim());
  }
  console.error(message);
  process.exit(1);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function assertWorkspaceCoverage() {
  const rootPackage = readJson('package.json');
  const configIndex = fs.readFileSync(path.join(root, 'packages/config/index.ts'), 'utf8');
  const boundariesFile = fs.readFileSync(
    path.join(root, 'packages/config/workspace-boundaries.ts'),
    'utf8',
  );

  const workspaceGlobs = rootPackage.workspaces || [];
  const requiredPaths = ['apps/api', 'apps/web', 'apps/stellar-service', 'packages/config', 'packages/types'];

  for (const requiredPath of requiredPaths) {
    if (!boundariesFile.includes(`path: '${requiredPath}'`)) {
      fail(`Workspace boundary metadata is missing an entry for ${requiredPath}.`);
    }
  }

  if (!workspaceGlobs.includes('apps/*') || !workspaceGlobs.includes('packages/*')) {
    fail('Root workspaces must continue to expose both apps/* and packages/*.');
  }

  if (!configIndex.includes('workspaceBoundarySummary')) {
    fail('Shared config must export workspace boundary summary for downstream tooling.');
  }
}

function assertSharedPackageExports() {
  const configPackage = readJson('packages/config/package.json');
  const typesPackage = readJson('packages/types/package.json');
  const requiredConfigExports = ['.', './public', './feature-flags', './workspace-boundaries'];

  for (const key of requiredConfigExports) {
    if (!configPackage.exports || !configPackage.exports[key]) {
      fail(`@lumen/config is missing required export ${key}.`);
    }
  }

  if (!typesPackage.main || !typesPackage.types) {
    fail('@lumen/types must expose both runtime and type entrypoints.');
  }
}

function assertFixtureCoverage() {
  const fixtureIndex = path.join(root, 'apps/api/tests/fixtures/index.ts');
  if (!fs.existsSync(fixtureIndex)) {
    fail('Expected shared API test fixtures at apps/api/tests/fixtures/index.ts.');
  }

  const coreWorkflowTest = fs.readFileSync(
    path.join(root, 'apps/api/tests/core.workflow.contracts.test.ts'),
    'utf8',
  );
  const historyTest = fs.readFileSync(
    path.join(root, 'apps/api/tests/history.service.test.ts'),
    'utf8',
  );

  if (!coreWorkflowTest.includes('../tests/fixtures') && !coreWorkflowTest.includes('./fixtures')) {
    fail('Core workflow contract test should consume shared fixtures.');
  }

  if (!historyTest.includes('../tests/fixtures') && !historyTest.includes('./fixtures')) {
    fail('History service test should consume shared fixtures.');
  }
}

function assertBoundaryChecks() {
  const boundaryCheck = run('node', ['packages/config/check-workspace-boundaries.cjs']);
  if (boundaryCheck.status !== 0) {
    fail('Workspace boundary check failed.', boundaryCheck.stderr || boundaryCheck.stdout);
  }

  const fixtureCheck = run('node', ['packages/config/check-workspace-boundaries.cjs', '--fixtures']);
  if (fixtureCheck.status !== 0) {
    fail('Workspace boundary fixture check failed.', fixtureCheck.stderr || fixtureCheck.stdout);
  }
}

assertWorkspaceCoverage();
assertSharedPackageExports();
assertFixtureCoverage();
assertBoundaryChecks();

console.log('Architecture verification passed.');
