"use client";

import { useState } from "react";

import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useUpdateUserRole, useUsers } from "@/lib/api/hooks";

const roleOptions = [
  "ADMIN",
  "APPROVER1",
  "APPROVER2",
  "APPROVER3",
  "APPROVER4",
  "FINANCE",
];

export default function UsersAdminPage() {
  const usersQuery = useUsers();
  const updateRole = useUpdateUserRole();
  const [branchDrafts, setBranchDrafts] = useState<Record<string, string>>({});
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string>>({});

  const users = usersQuery.data?.users ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dusk">
          Admin controls
        </p>
        <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold">
          User administration
        </h1>
        <p className="mt-2 text-sm text-dusk">
          Assign approver lanes, finance access, and branch alignment without touching code.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Users"
          value={String(users.length)}
          detail="Active platform accounts"
          accent={<div className="h-9 w-9 rounded-2xl bg-mint/15" />}
        />
        <MetricCard
          label="Approvers"
          value={String(users.filter((user) => user.role.startsWith("APPROVER")).length)}
          detail="Across all approval levels"
          accent={<div className="h-9 w-9 rounded-2xl bg-amber-100" />}
        />
        <MetricCard
          label="Finance"
          value={String(users.filter((user) => user.role === "FINANCE").length)}
          detail="Operational finance seats"
          accent={<div className="h-9 w-9 rounded-2xl bg-sky-100" />}
        />
      </div>

      <Panel className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.16em] text-dusk">
            <tr>
              <th className="pb-3">User</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Branch</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Save</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="border-t border-slate-100 py-4">
                  <div className="font-medium text-ink">{user.name}</div>
                  <div className="text-xs text-dusk">{user.email}</div>
                </td>
                <td className="border-t border-slate-100 py-4">
                  <select
                    value={roleDrafts[user.id] ?? user.role}
                    onChange={(event) =>
                      setRoleDrafts((current) => ({
                        ...current,
                        [user.id]: event.target.value,
                      }))
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-t border-slate-100 py-4">
                  <input
                    value={branchDrafts[user.id] ?? user.branch ?? ""}
                    placeholder="Optional branch"
                    onChange={(event) =>
                      setBranchDrafts((current) => ({
                        ...current,
                        [user.id]: event.target.value,
                      }))
                    }
                  />
                </td>
                <td className="border-t border-slate-100 py-4">
                  <StatusBadge value={user.isActive ? "APPROVED" : "VOID"} />
                </td>
                <td className="border-t border-slate-100 py-4">
                  <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-ink"
                    onClick={() =>
                      void updateRole.mutateAsync({
                        userId: user.id,
                        role: roleDrafts[user.id] ?? user.role,
                        branch: branchDrafts[user.id] ?? user.branch ?? undefined,
                      })
                    }
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

