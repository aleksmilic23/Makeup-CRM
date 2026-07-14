"use client";

import { useState } from "react";
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
  Menu,
  X,
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b bg-card px-4 py-3 sticky top-0 z-30 md:hidden">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-pink-500" />
          <span className="font-semibold text-sm tracking-tight">SairaOBeauty</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-56 shrink-0 border-r bg-card flex flex-col h-screen fixed md:sticky top-0 z-50 transition-transform duration-200 ease-out md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-pink-500" />
            <span className="font-semibold text-sm tracking-tight">SairaOBeauty</span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-1 rounded text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 p-3 space-y-0.5" onClick={() => setOpen(false)}>
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
    </>
  );
}
