import { AuthCard } from "../../auth/_components/auth-card";
import { StaffDirectory } from "../_components/staff-directory";

export default function StaffDirectoryPage() {
  return (
    <main id="main-content" tabIndex={-1} className="authPage">
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
