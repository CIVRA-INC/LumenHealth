import { AuthCard } from "../auth/_components/auth-card";
import { AuditLog } from "./_components/audit-log";
import { AnchoringHealthPanel } from "./_components/anchoring-health-panel";

export default function AuditLogPage() {
  return (
    <main className="authPage">
      <AuthCard
        eyebrow="Audit"
        title="Audit log"
        description="Tamper-evident history of clinic activity, anchored to Stellar."
      >
        <AnchoringHealthPanel />
        <AuditLog />
      </AuthCard>
    </main>
  );
}
