import { assertNoLeakIntoDevelopment } from './database-guard';

export default async function globalTeardown() {
  await assertNoLeakIntoDevelopment();
}
