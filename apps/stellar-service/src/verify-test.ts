import { TransactionVerificationService } from "./services/verify.service";

const run = async () => {
  const verifier = new TransactionVerificationService();

  console.log("🔍 Testing Verification Service...");

  // CASE 1: Test with a FAKE hash (Should fail gracefully)
  const fakeHash = "0000000000000000000000000000000000000000000000000000000000000000";
  console.log(`\n1. Checking Fake Hash: ${fakeHash.substring(0, 8)}...`);
  
  const result1 = await verifier.verifyPayment(
    fakeHash, 
    "100", 
    "ace020..." // Fake memo
  );
  
  console.log("Result:", result1); // Should say "Transaction hash not found"

  // NOTE: To test a TRUE success, you would need to manually send XLM 
  // on the Stellar Laboratory to your platform wallet with a specific memo,
  // then copy that hash here.
};

run();