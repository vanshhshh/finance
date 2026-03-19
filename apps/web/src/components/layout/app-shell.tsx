"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRightLeft, ClipboardCheck, Landmark, Users } from "lucide-react";

import type { UserRole } from "@finance-platform/shared";

import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

const items = [
  {
    href: "/dashboard/payments",
    label: "Payments",
    icon: Landmark,
    roles: ["ADMIN", "FINANCE"] satisfies UserRole[],
  },
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    icon: ArrowRightLeft,
    roles: ["ADMIN", "FINANCE", "APPROVER1", "APPROVER2", "APPROVER3", "APPROVER4"] satisfies UserRole[],
  },
  {
    href: "/dashboard/approvals",
    label: "Approvals",
    icon: ClipboardCheck,
    roles: ["ADMIN", "APPROVER1", "APPROVER2", "APPROVER3", "APPROVER4", "FINANCE"] satisfies UserRole[],
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    roles: ["ADMIN"] satisfies UserRole[],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const visibleItems = items.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-dashboard-grid text-ink">
      <div className="mx-auto flex max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-72 flex-col rounded-[2rem] border border-white/60 bg-ink px-6 py-7 text-white shadow-panel lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/60">
              AltF Finance OS
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Collections and approvals</h1>
            <p className="mt-3 text-sm text-white/70">
              Internal finance cockpit for receivables, approvals, settlements, and audit-ready sync.
            </p>
          </div>

          <nav className="mt-10 space-y-2">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition",
                    active
                      ? "bg-white text-ink"
                      : "text-white/80 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-medium">{user?.name}</p>
            <p className="mt-1 text-xs text-white/60">{user?.email}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-mint">
              {user?.role}
            </p>
            <button
              type="button"
              onClick={() => void logout()}
              className="mt-4 w-full rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-ink"
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="rounded-[2rem] border border-white/70 bg-white/60 p-4 shadow-panel backdrop-blur lg:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

