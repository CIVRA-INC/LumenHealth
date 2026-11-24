import { assertPristineSeed } from './database-guard';

export default async function globalSetup() {
  await assertPristineSeed();
}
