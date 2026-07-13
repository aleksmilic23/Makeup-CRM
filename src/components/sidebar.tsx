"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Scissors,
  Package,
  Receipt,
  Sparkles,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/appointments", label: "Appointments", icon: CalendarDays },
  { href: "/services", label: "Services", icon: Scissors },
  { href: "/products", label: "Products", icon: Package },
  { href: "/invoices", label: "Invoices", icon: Receipt },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r bg-card flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 py-4 border-b">
        <Sparkles className="h-5 w-5 text-pink-500" />
        <span className="font-semibold text-sm tracking-tight">SairaOBeauty</span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === href
                ? "bg-pink-50 text-pink-700"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
