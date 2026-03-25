import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { DashboardLayout as DashboardShell } from "@/layouts/DashboardLayout";
import { EncounterProvider } from "@/providers/EncounterProvider";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedLayout>
      <EncounterProvider>
        <DashboardShell>{children}</DashboardShell>
      </EncounterProvider>
    </ProtectedLayout>
  );
}
