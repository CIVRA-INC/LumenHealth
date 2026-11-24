/* eslint-disable no-console */
/**
 * `pnpm shots`: visual review against a clean, repeatable stack that never touches the development or
 * end-to-end databases.
 *
 *   1. recreates the disposable `*_visual` database from migrations + the standard demo seed
 *   2. starts the API and the web app on their own ports against that database
 *   3. adds the adversarial fixtures (very long name and note) to that database only
 *   4. takes the screenshots (see scripts/screenshots.mjs) and stops everything
 *
 * Every run starts from the same seeded state, so nothing accumulates between runs. Extra arguments and
 * the SIZES / FULL environment variables are passed to the screenshot script.
 */
import { execFileSync, spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
try {
  process.loadEnvFile(join(root, '.env'));
} catch {
  // The environment may already be set.
}

const API_PORT = 4020;
const WEB_PORT = 5175;

function derive(urlText, from, to) {
  const url = new URL(urlText);
  if (!url.pathname.endsWith(from))
    throw new Error(`Cannot derive a ${to} URL from ${url.pathname}`);
  url.pathname = url.pathname.slice(0, -from.length) + to;
  return url.toString();
}
const appUrl =
  process.env.VISUAL_DATABASE_URL ??
  (process.env.E2E_DATABASE_URL ? derive(process.env.E2E_DATABASE_URL, '_e2e', '_visual') : '');
if (!appUrl || !new URL(appUrl).pathname.endsWith('_visual')) {
  console.error('The review database URL must name a database ending in "_visual". Check .env.');
  process.exit(1);
}

const run = (args) => execFileSync('pnpm', args, { cwd: root, stdio: 'inherit' });
run(['--filter', '@lumen/api', 'visual:prepare']);
run(['--filter', '@lumen/api', 'build']);

const children = [];
const stop = () => children.forEach((c) => c.kill('SIGTERM'));
process.on('exit', stop);
process.on('SIGINT', () => process.exit(130));

children.push(
  spawn('node', ['apps/api/dist/main.js'], {
    cwd: root,
    stdio: 'ignore',
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: appUrl,
      API_PORT: String(API_PORT),
      WEB_ORIGINS: `http://localhost:${WEB_PORT}`,
      LOG_LEVEL: 'warn',
      RATE_LIMIT_ENABLED: 'false',
      SWAGGER_ENABLED: 'false',
    },
  }),
  spawn('pnpm', ['--filter', '@lumen/web', 'exec', 'vite'], {
    cwd: root,
    stdio: 'ignore',
    env: {
      ...process.env,
      WEB_PORT: String(WEB_PORT),
      VITE_API_PROXY_TARGET: `http://127.0.0.1:${API_PORT}`,
    },
  }),
);

async function waitFor(url) {
  for (let i = 0; i < 120; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}
await waitFor(`http://127.0.0.1:${API_PORT}/api/v1/health/ready`);
await waitFor(`http://localhost:${WEB_PORT}`);

try {
  execFileSync('node', ['scripts/screenshots.mjs', ...process.argv.slice(2)], {
    cwd: join(root, 'apps', 'web'),
    stdio: 'inherit',
    env: { ...process.env, BASE_URL: `http://localhost:${WEB_PORT}`, SHOTS_FIXTURES: '1' },
  });
} finally {
  stop();
}
