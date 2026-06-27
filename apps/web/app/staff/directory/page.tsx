import { AuthCard } from "../../auth/_components/auth-card";
import { StaffDirectory } from "../_components/staff-directory";

export default function StaffDirectoryPage() {
  return (
    <main className="authPage">
      <AuthCard
        eyebrow="Staff"
        title="Directory"
        description="View and manage your clinic's team."
      >
        <StaffDirectory />
      </AuthCard>
    </main>
  );
}
