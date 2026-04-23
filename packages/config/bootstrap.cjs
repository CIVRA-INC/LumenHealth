#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const envPath = path.join(root, '.env');
const args = new Set(process.argv.slice(2));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const requiredEnvVars = [
  'MONGO_URI',
  'JWT_ACCESS_TOKEN_SECRET',
  'JWT_REFRESH_TOKEN_SECRET',
];

const optionalFeatureEnvVars = [
  'GEMINI_API_KEY',
  'STELLAR_PLATFORM_PUBLIC_KEY',
  'STELLAR_SECRET_KEY',
];

function getNodeVersion() {
  const [major] = process.versions.node.split('.').map((value) => Number(value));
  return major;
}

function run(command, commandArgs) {
  return spawnSync(command, commandArgs, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
  });
}

function formatResult(label, status, detail) {
  const icon = status === 'ok' ? '✓' : status === 'warn' ? '!' : '✗';
  console.log(`${icon} ${label}: ${detail}`);
}

function parseMongoTarget(uri) {
  try {
    const normalized = uri.startsWith('mongodb+srv://') ? null : new URL(uri);
    if (!normalized) {
      return null;
    }

    return {
      host: normalized.hostname || 'localhost',
      port: Number(normalized.port || 27017),
    };
  } catch {
    return null;
  }
}

function probeTcp(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (status, detail) => {
      socket.destroy();
      resolve({ status, detail });
    };

    socket.setTimeout(1500);
    socket.on('connect', () => done('ok', `reachable at ${host}:${port}`));
    socket.on('timeout', () => done('warn', `timed out while checking ${host}:${port}`));
    socket.on('error', (error) => done('warn', error.message));
  });
}

async function main() {
  let hasFailure = false;

  if (getNodeVersion() >= 18) {
    formatResult('Node.js', 'ok', `v${process.versions.node}`);
  } else {
    hasFailure = true;
    formatResult('Node.js', 'fail', `v${process.versions.node} detected, expected >= 18`);
  }

  const npmVersion = run('npm', ['--version']);
  if (npmVersion.status === 0) {
    formatResult('npm', 'ok', npmVersion.stdout.trim());
  } else {
    hasFailure = true;
    formatResult('npm', 'fail', npmVersion.stderr.trim() || 'unable to read npm version');
  }

  if (fs.existsSync(envPath)) {
    formatResult('.env', 'ok', 'root environment file detected');
  } else {
    hasFailure = true;
    formatResult('.env', 'fail', 'root .env file is missing');
  }

  const missingRequired = requiredEnvVars.filter((name) => !process.env[name]?.trim());
  if (missingRequired.length === 0) {
    formatResult('Required secrets', 'ok', requiredEnvVars.join(', '));
  } else {
    hasFailure = true;
    formatResult('Required secrets', 'fail', `missing ${missingRequired.join(', ')}`);
  }

  const missingOptional = optionalFeatureEnvVars.filter((name) => !process.env[name]?.trim());
  if (missingOptional.length > 0) {
    formatResult(
      'Optional integrations',
      'warn',
      `not configured: ${missingOptional.join(', ')}`,
    );
  } else {
    formatResult('Optional integrations', 'ok', 'Gemini and Stellar secrets configured');
  }

  const mongoTarget = parseMongoTarget(process.env.MONGO_URI || '');
  if (!mongoTarget) {
    formatResult(
      'MongoDB check',
      'warn',
      'unable to parse MONGO_URI host/port automatically (mongodb+srv or custom syntax)',
    );
  } else {
    const mongoProbe = await probeTcp(mongoTarget.host, mongoTarget.port);
    formatResult('MongoDB check', mongoProbe.status, mongoProbe.detail);
  }

  if (args.has('--seed-demo')) {
    const seedResult = run('npm', ['run', 'seed:demo', '-w', 'apps/api']);
    if (seedResult.status === 0) {
      formatResult('Demo seed', 'ok', 'seed script completed');
    } else {
      hasFailure = true;
      formatResult('Demo seed', 'fail', seedResult.stderr.trim() || 'seed script failed');
    }
  } else {
    formatResult('Demo seed', 'warn', 'skipped (pass --seed-demo to run it)');
  }

  if (hasFailure) {
    process.exit(1);
  }
}

void main();
