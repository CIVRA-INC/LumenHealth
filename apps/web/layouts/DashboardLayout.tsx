"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { SubscriptionProvider } from "@/providers/SubscriptionProvider";

const NAV = [
  { href: "/dashboard", label: "Dashboard", roles: "ALL" },
  { href: "/dashboard/queue", label: "Queue", roles: "ALL" },
  { href: "/dashboard/encounters", label: "Encounters", roles: "ALL" },
  { href: "/dashboard/vitals", label: "Vitals", roles: "ALL" },
  { href: "/dashboard/notes", label: "Notes", roles: "ALL" },
  { href: "/dashboard/diagnoses", label: "Diagnoses", roles: "ALL" },
  { href: "/dashboard/patients", label: "Patients", roles: "ALL" },
  { href: "/dashboard/settings/staff", label: "Staff", roles: ["SUPER_ADMIN", "CLINIC_ADMIN"] },
  { href: "/dashboard/audit", label: "Audit Logs", roles: ["SUPER_ADMIN", "CLINIC_ADMIN"] },
  { href: "/dashboard/billing", label: "Billing", roles: ["SUPER_ADMIN", "CLINIC_ADMIN"] },
] as const;

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const visibleNav = NAV.filter((item) => item.roles === "ALL" || item.roles.includes(user?.role ?? ""));

  return (
    <SubscriptionProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[230px_1fr] md:p-6">
          <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              LumenHealth
            </p>
            <nav className="space-y-2">
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md border px-3 py-2 text-sm font-medium ${
                    pathname === item.href
                      ? "border-teal-700 bg-teal-50 text-teal-900"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <button
              type="button"
              onClick={logout}
              className="mt-6 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Logout
            </button>
          </aside>

          <section className="min-w-0">{children}</section>
        </div>
      </div>
    </SubscriptionProvider>
  );
};
