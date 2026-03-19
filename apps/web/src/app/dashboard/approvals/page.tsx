"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { useApprovalDashboard, useApproveExpense } from "@/lib/api/hooks";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ApprovalsPage() {
  const { user } = useAuth();
  const dashboard = useApprovalDashboard();
  const approveMutation = useApproveExpense();

  const pending = dashboard.data?.pending ?? [];
  const recent = dashboard.data?.recent ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dusk">
          Approval center
        </p>
        <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold">
          Approval queue
        </h1>
        <p className="mt-2 text-sm text-dusk">
          Route decisions through the right approver at the right level, with a live queue.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Pending for you"
          value={String(pending.length)}
          detail={`${user?.role ?? "USER"} queue`}
          accent={<Clock3 className="h-9 w-9 rounded-2xl bg-amber-100 p-2 text-amber-700" />}
        />
        <MetricCard
          label="Recently cleared"
          value={String(recent.length)}
          detail="Most recent approval history"
          accent={<CheckCircle2 className="h-9 w-9 rounded-2xl bg-emerald-100 p-2 text-emerald-700" />}
        />
        <MetricCard
          label="Escalation risk"
          value={String(pending.filter((item) => item.expense.agingDays >= 30).length)}
          detail="Pending and aging 30+ days"
          accent={<XCircle className="h-9 w-9 rounded-2xl bg-rose-100 p-2 text-rose-700" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <div>
            <p className="text-sm font-semibold text-ink">Pending approvals</p>
            <p className="text-sm text-dusk">
              Act on the current level only. Finance will see updates immediately.
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {pending.map((item) => (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-100 bg-slate-50/60 p-4"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-ink">
                        {item.expense.expenseCode}
                      </p>
                      <StatusBadge value={item.expense.status} />
                    </div>
                    <p className="mt-2 text-sm text-dusk">
                      {item.expense.vendor} • {item.expense.branch} • Level {item.level}
                    </p>
                    <p className="mt-2 text-sm text-ink">
                      {formatCurrency(item.expense.netAmount)} • aging {item.expense.agingDays} days
                    </p>
                    {item.expense.description ? (
                      <p className="mt-3 text-sm text-dusk">{item.expense.description}</p>
                    ) : null}
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => {
                        const comments = window.prompt("Approval note (optional)");
                        void approveMutation.mutateAsync({
                          expenseId: item.expense.id,
                          level: item.level,
                          payload: {
                            action: "approve",
                            comments: comments || undefined,
                          },
                        });
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white"
                      onClick={() => {
                        const comments = window.prompt("Reason for rejection");
                        if (!comments) return;
                        void approveMutation.mutateAsync({
                          expenseId: item.expense.id,
                          level: item.level,
                          payload: {
                            action: "reject",
                            comments,
                          },
                        });
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <p className="text-sm font-semibold text-ink">Recently approved</p>
          <p className="mt-1 text-sm text-dusk">
            Latest actions taken by you or across the admin queue.
          </p>
          <div className="mt-5 space-y-4">
            {recent.map((item) => (
              <div key={item.id} className="rounded-3xl border border-slate-100 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{item.expense.expenseCode}</p>
                    <p className="mt-1 text-sm text-dusk">{item.expense.vendor}</p>
                  </div>
                  <StatusBadge value={item.status} />
                </div>
                <p className="mt-3 text-sm text-dusk">
                  Level {item.level} • {formatDate(item.expense.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

