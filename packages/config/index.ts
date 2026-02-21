import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.API_PORT || 4000,

  mongoUri: process.env.MONGO_URI || '',
  jwt: {
    accessTokenSecret: process.env.JWT_ACCESS_TOKEN_SECRET || '',
    refreshTokenSecret: process.env.JWT_REFRESH_TOKEN_SECRET || '',
  },
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    horizonUrl:
      process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
    platformPublicKey: process.env.STELLAR_PLATFORM_PUBLIC_KEY || '',
  },
};
