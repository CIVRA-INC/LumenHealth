import { config, getServerPublicKey, StellarNetwork } from './config';

const startStellarService = async () => {
  console.log('🚀 Stellar Service Starting...');
  console.log(`🌍 Network: ${config.network}`);

  try {
    const publicKey = getServerPublicKey();
    console.log(`🔑 Server Wallet: ${publicKey}`);

    if (config.network === StellarNetwork.TESTNET) {
      console.log('🧪 Running in Test Mode');
    }

    console.log('✅ Service Initialized Successfully');
  } catch (error) {
    console.error('❌ Startup Failed:', error);
    process.exit(1);
  }
};

startStellarService();
