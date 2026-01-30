import { PlatformWalletService } from "./services/wallet.service";

const run = async () => {
  console.log("🚀 Starting Stellar Service Health Check...");
  
  const wallet = new PlatformWalletService();

  try {
    const publicKey = wallet.getPublicKey();
    console.log(`Checking balance for: ${publicKey}`);

    const balance = await wallet.getNativeBalance();
    console.log(`✅ Success! Balance: ${balance} XLM`);
    
    if (parseFloat(balance) < 5) {
      console.warn("⚠️ Warning: Low balance. Please fund your testnet account.");
    }

  } catch (error: any) {
    console.error("❌ Failed:", error.message);
  }
};

run();