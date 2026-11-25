/**
 * Provisions the first platform administrator. Run deliberately, once, by an authorised operator:
 *
 *   node dist/scripts/bootstrap-platform-admin.js --email you@example.com --name "Your Name"
 *
 * The password is read from PLATFORM_ADMIN_PASSWORD, or typed at a hidden prompt when a terminal is
 * attached. It is never accepted as a command-line argument (those leak into shell history and `ps`).
 * Safe to re-run: it refuses to create a second administrator or to touch an existing account.
 */
import { createInterface } from 'node:readline';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { PasswordService } from '../modules/identity/password.service';
import { bootstrapPlatformAdmin } from '../modules/platform/bootstrap';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY)
      return reject(new Error('No terminal attached: set PLATFORM_ADMIN_PASSWORD instead.'));
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    process.stdout.write(question);
    const out = rl as unknown as { _writeToOutput: (s: string) => void };
    out._writeToOutput = () => undefined; // do not echo keystrokes
    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const email = arg('email');
  const fullName = arg('name');
  if (!email || !fullName) throw new Error('Usage: --email <address> --name "<full name>"');
  const password = process.env.PLATFORM_ADMIN_PASSWORD ?? (await promptHidden('Password: '));

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const result = await bootstrapPlatformAdmin(prisma, new PasswordService(), {
      email,
      fullName,
      password,
    });
    if (result.created) {
      console.log(`Platform administrator created for ${email.trim().toLowerCase()}.`);
      console.log('They must change the password at first sign-in. Nothing else was modified.');
    } else if (result.reason === 'platform_admin_exists') {
      console.log('A platform administrator already exists. Nothing was changed.');
    } else {
      console.error('That email already belongs to an account. Nothing was changed.');
      process.exitCode = 2;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Bootstrap failed');
  process.exit(1);
});
