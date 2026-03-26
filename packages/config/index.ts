import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requireEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[config] Missing required environment variable: ${name}`);
  }

  return value;
};

const optionalEnv = (name: string, fallback = '') => process.env[name]?.trim() || fallback;

export const config = {
  port: process.env.API_PORT || 4000,

  mongoUri: requireEnv('MONGO_URI'),
  jwt: {
    accessTokenSecret: requireEnv('JWT_ACCESS_TOKEN_SECRET'),
    refreshTokenSecret: requireEnv('JWT_REFRESH_TOKEN_SECRET'),
  },
  stellar: {
    network: optionalEnv('STELLAR_NETWORK', 'testnet'),
    horizonUrl:
      optionalEnv('STELLAR_HORIZON_URL', 'https://horizon-testnet.stellar.org'),
    platformPublicKey: optionalEnv('STELLAR_PLATFORM_PUBLIC_KEY'),
  },
};
