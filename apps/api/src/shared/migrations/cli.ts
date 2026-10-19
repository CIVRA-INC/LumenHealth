import { MongoClient } from 'mongodb';
import { migrations } from './index.js';
import { MongoMigrationStore } from './mongo-store.js';
import { MigrationRunner } from './runner.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI is required');
  process.exit(1);
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const runner = new MigrationRunner(new MongoMigrationStore(client.db(process.env.MONGODB_DB ?? 'lumenhealth')), migrations);
  const direction = process.argv[2] === 'down' ? 'down' : 'up';
  const ran = direction === 'down' ? await runner.down(Number(process.argv[3] ?? 1)) : await runner.up();
  console.log(ran.length ? `${direction}: ${ran.join(', ')}` : 'nothing to do');
} finally {
  await client.close();
}
