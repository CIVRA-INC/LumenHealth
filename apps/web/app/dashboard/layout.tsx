import { ProtectedLayout } from "@/layouts/ProtectedLayout";
import { DashboardLayout as DashboardShell } from "@/layouts/DashboardLayout";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ProtectedLayout>
      <DashboardShell>{children}</DashboardShell>
    </ProtectedLayout>
  );
}
