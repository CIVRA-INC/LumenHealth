"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/patients", label: "Patients", icon: "👤" },
  { href: "/encounters", label: "Encounters", icon: "📋" },
  { href: "/payments", label: "Payments", icon: "💳" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-1 px-3 py-2 text-xs rounded-lg transition-colors
        ${active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
    >
      <span className="text-xl" aria-hidden>{item.icon}</span>
      {item.label}
    </Link>
  );
}

/** Bottom bar on mobile, left sidebar on md+. */
export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile bottom bar */}
      <nav aria-label="Main navigation" className="fixed bottom-0 inset-x-0 z-50 flex justify-around bg-background border-t py-1 md:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>

      {/* Desktop sidebar */}
      <nav aria-label="Main navigation" className="hidden md:flex flex-col gap-1 w-56 shrink-0 border-r px-3 py-6 min-h-screen">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} active={pathname.startsWith(item.href)} />
        ))}
      </nav>
    </>
  );
}
