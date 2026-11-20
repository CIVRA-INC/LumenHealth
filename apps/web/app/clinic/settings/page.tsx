import { AuthCard } from "../../auth/_components/auth-card";
import { ClinicSettingsForm } from "../_components/clinic-settings-form";

export default function ClinicSettingsPage() {
  return (
    <main id="main-content" tabIndex={-1} className="authPage">
      <AuthCard
        eyebrow="Clinic"
        title="Settings"
        description="Update your clinic's contact details."
      >
        <ClinicSettingsForm />
      </AuthCard>
    </main>
  );
}
