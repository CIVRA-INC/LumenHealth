import { Horizon } from '@stellar/stellar-sdk';
import { config } from '@lumen/config';

export class StellarService {
  private server: Horizon.Server;

  constructor() {
    this.server = new Horizon.Server(config.stellar.horizonUrl);
  }

  async checkNetworkHealth() {
    try {
      const result = await this.server.root();
      console.log(`🌟 Stellar Network: ${result.network_passphrase}`);
      return true;
    } catch (error) {
      console.error('❌ Stellar connection failed');
      return false;
    }
  }
}

if (require.main === module) {
  new StellarService().checkNetworkHealth();
}
