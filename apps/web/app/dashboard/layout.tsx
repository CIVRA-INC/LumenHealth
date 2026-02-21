import { ProtectedLayout } from "@/layouts/ProtectedLayout";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
