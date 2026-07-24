import { AuthCard } from "../auth/_components/auth-card";
import { AuditLog } from "./_components/audit-log";

export default function AuditLogPage() {
  return (
    <main className="authPage">
      <AuthCard
        eyebrow="Audit"
        title="Audit log"
        description="Tamper-evident history of clinic activity, anchored to Stellar."
      >
        <AuditLog />
      </AuthCard>
    </main>
  );
}
