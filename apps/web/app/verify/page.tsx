import { AuthCard } from "../auth/_components/auth-card";
import { VerifyExportPortal } from "./_components/verify-export-portal";

export default function VerifyExportPage() {
  return (
    <main className="authPage">
      <AuthCard
        eyebrow="Public verification"
        title="Verify a compliance export"
        description="Check a LumenHealth audit export against public Stellar state. No account needed."
      >
        <VerifyExportPortal />
      </AuthCard>
    </main>
  );
}
