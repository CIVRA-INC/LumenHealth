#!/usr/bin/env node
/**
 * One-command local setup: environment file, database container, migrations and demo data.
 * Safe to re-run. It never resets or deletes data.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
const step = (text) => console.log(`\n\x1b[1m▸ ${text}\x1b[0m`);

const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`Node 22.12 or newer is required (found ${process.versions.node}). See .nvmrc.`);
  process.exit(1);
}

step('Environment file');
if (existsSync(join(root, '.env'))) console.log('.env already exists; leaving it unchanged.');
else {
  copyFileSync(join(root, '.env.example'), join(root, '.env'));
  console.log('Created .env from .env.example (development values only).');
}

step('Installing dependencies');
run('pnpm', ['install']);

step('Starting PostgreSQL (Docker)');
try {
  run('docker', ['compose', 'up', '-d', '--wait', 'postgres']);
} catch {
  console.error(
    '\nCould not start PostgreSQL. Is Docker running? Start Docker Desktop, then re-run `pnpm bootstrap`.',
  );
  process.exit(1);
}

step('Building shared contracts');
run('pnpm', ['build:contracts']);

step('Applying database migrations');
run('pnpm', ['--filter', '@lumen/api', 'db:generate']);
run('pnpm', ['db:migrate']);

step('Loading synthetic demo data');
run('pnpm', ['db:seed']);

console.log(`
\x1b[32mReady.\x1b[0m Start the app with:  pnpm dev
  Web    http://localhost:5173
  API    http://localhost:4000/api/docs
Sign in with any demo account listed above (password LumenDemo!2026).
`);
