"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { UserRole } from "@finance-platform/shared";

import { useAuth } from "./auth-provider";

export function AuthGuard({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/signin");
      return;
    }

    if (!isLoading && user && roles && !roles.includes(user.role)) {
      router.replace("/dashboard/payments");
    }
  }, [isLoading, roles, router, user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dashboard-grid">
        <div className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-dusk shadow-panel">
          Loading workspace...
        </div>
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

