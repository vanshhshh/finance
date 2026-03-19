"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Coins, Download, ReceiptIndianRupee, UploadCloud } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useAddExpenseSettlement,
  useCreateExpense,
  useExpenseSummary,
  useExpenses,
  useImportWorkbook,
} from "@/lib/api/hooks";
import { webEnv } from "@/lib/env";
import { formatCurrency, formatDate } from "@/lib/utils";

const ChartBar = Bar as any;
const ChartBarChart = BarChart as any;
const ChartTooltip = Tooltip as any;
const ChartXAxis = XAxis as any;
const ChartYAxis = YAxis as any;

export default function ExpensesPage() {
  const [filters, setFilters] = useState({
    search: "",
    vendor: "",
    branch: "",
    expenseHead: "",
    status: "",
    agingBucket: "",
  });
  const [form, setForm] = useState({
    vendor: "",
    branch: "",
    expenseHead: "",
    amount: "",
    gstAmount: "0",
    tdsAmount: "0",
    invoiceDate: "",
    description: "",
  });
  const { token, user } = useAuth();
  const expenses = useExpenses(filters);
  const summary = useExpenseSummary(filters);
  const createExpense = useCreateExpense();
  const addSettlement = useAddExpenseSettlement();
  const importMutation = useImportWorkbook("/api/expenses/import");

  const summaryData = (summary.data ?? {}) as Record<string, number>;
  const agingChart = [
    { name: "Current", value: summaryData.agingCurrent ?? 0 },
    { name: "30", value: summaryData.aging30 ?? 0 },
    { name: "45", value: summaryData.aging45 ?? 0 },
    { name: "60+", value: summaryData.aging60 ?? 0 },
  ];

  const handleExport = async () => {
    if (!token) return;
    const query = new URLSearchParams({
      page: "1",
      pageSize: "100",
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.vendor ? { vendor: filters.vendor } : {}),
      ...(filters.branch ? { branch: filters.branch } : {}),
      ...(filters.expenseHead ? { expenseHead: filters.expenseHead } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.agingBucket ? { agingBucket: filters.agingBucket } : {}),
    });
    const response = await fetch(`${webEnv.apiUrl}/api/expenses/export?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "expenses.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dusk">
            Expense OS
          </p>
          <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold">
            Expenses and payouts
          </h1>
          <p className="mt-2 text-sm text-dusk">
            Create expenses, track aging, and control cash-out with approval and settlement visibility.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
            <UploadCloud className="h-4 w-4" />
            {importMutation.isPending ? "Importing..." : "Import workbook"}
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void importMutation.mutateAsync(file);
                }
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void handleExport()}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Amount"
          value={formatCurrency(summaryData.totalAmount ?? 0)}
          detail={`${summaryData.pending ?? 0} pending approvals`}
          accent={<ReceiptIndianRupee className="h-9 w-9 rounded-2xl bg-mint/15 p-2 text-tide" />}
        />
        <MetricCard
          label="Total Outstanding"
          value={formatCurrency(summaryData.totalOutstanding ?? 0)}
          detail={`${summaryData.partial ?? 0} partial payouts`}
          accent={<Coins className="h-9 w-9 rounded-2xl bg-orange-100 p-2 text-orange-700" />}
        />
        <MetricCard
          label="Paid"
          value={`${summaryData.paid ?? 0}`}
          detail={formatCurrency(summaryData.totalPaid ?? 0)}
          accent={<Coins className="h-9 w-9 rounded-2xl bg-emerald-100 p-2 text-emerald-700" />}
        />
        <MetricCard
          label="Rejected"
          value={`${summaryData.rejected ?? 0}`}
          detail="Stopped before payout"
          accent={<Coins className="h-9 w-9 rounded-2xl bg-rose-100 p-2 text-rose-700" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <Panel>
          <p className="text-sm font-semibold text-ink">Create expense</p>
          <p className="mt-1 text-sm text-dusk">
            Finance can create a fresh request and push it into the 4-level approval chain.
          </p>

          <div className="mt-5 grid gap-3">
            <input
              value={form.vendor}
              onChange={(event) => setForm((current) => ({ ...current, vendor: event.target.value }))}
              placeholder="Vendor"
            />
            <input
              value={form.branch}
              onChange={(event) => setForm((current) => ({ ...current, branch: event.target.value }))}
              placeholder="Branch"
            />
            <input
              value={form.expenseHead}
              onChange={(event) =>
                setForm((current) => ({ ...current, expenseHead: event.target.value }))
              }
              placeholder="Expense head"
            />
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="number"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                placeholder="Amount"
              />
              <input
                type="number"
                value={form.gstAmount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, gstAmount: event.target.value }))
                }
                placeholder="GST"
              />
              <input
                type="number"
                value={form.tdsAmount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, tdsAmount: event.target.value }))
                }
                placeholder="TDS"
              />
            </div>
            <input
              type="datetime-local"
              value={form.invoiceDate}
              onChange={(event) =>
                setForm((current) => ({ ...current, invoiceDate: event.target.value }))
              }
            />
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Notes or justification"
            />

            <button
              type="button"
              disabled={createExpense.isPending}
              onClick={() =>
                void createExpense.mutateAsync({
                  ...form,
                  amount: Number(form.amount),
                  gstAmount: Number(form.gstAmount),
                  tdsAmount: Number(form.tdsAmount),
                  invoiceDate: form.invoiceDate ? new Date(form.invoiceDate).toISOString() : undefined,
                })
              }
              className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
            >
              {createExpense.isPending ? "Submitting..." : "Create expense"}
            </button>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Unpaid aging buckets</p>
              <p className="text-sm text-dusk">
                Finance can prioritize 30, 45, and 60+ day unpaid obligations.
              </p>
            </div>
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ChartBarChart data={agingChart}>
                <ChartXAxis dataKey="name" />
                <ChartYAxis hide />
                <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                <ChartBar dataKey="value" fill="#33C7A5" radius={[12, 12, 0, 0]} />
              </ChartBarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel className="grid gap-3 lg:grid-cols-6">
        <input
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          placeholder="Search code or vendor"
        />
        <input
          value={filters.vendor}
          onChange={(event) => setFilters((current) => ({ ...current, vendor: event.target.value }))}
          placeholder="Vendor"
        />
        <input
          value={filters.branch}
          onChange={(event) => setFilters((current) => ({ ...current, branch: event.target.value }))}
          placeholder="Branch"
        />
        <input
          value={filters.expenseHead}
          onChange={(event) =>
            setFilters((current) => ({ ...current, expenseHead: event.target.value }))
          }
          placeholder="Expense head"
        />
        <select
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="UNPAID">Approved / unpaid</option>
          <option value="PARTIAL">Partial</option>
          <option value="PAID">Paid</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select
          value={filters.agingBucket}
          onChange={(event) =>
            setFilters((current) => ({ ...current, agingBucket: event.target.value }))
          }
        >
          <option value="">All aging buckets</option>
          <option value="CURRENT">Current</option>
          <option value="30">30 days</option>
          <option value="45">45 days</option>
          <option value="60">60+ days</option>
        </select>
      </Panel>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Expense ledger</p>
            <p className="text-sm text-dusk">
              Status covers approval progression plus payout state for finance.
            </p>
          </div>
          <p className="text-sm text-dusk">{expenses.data?.pagination.total ?? 0} rows</p>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.16em] text-dusk">
              <tr>
                <th className="pb-3">Expense</th>
                <th className="pb-3">Vendor</th>
                <th className="pb-3">Branch</th>
                <th className="pb-3">Net</th>
                <th className="pb-3">Balance</th>
                <th className="pb-3">Aging</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.data?.data.map((expense) => (
                <tr key={expense.id}>
                  <td className="border-t border-slate-100 py-4">
                    <div className="font-medium text-ink">{expense.expenseCode}</div>
                    <div className="text-xs text-dusk">{expense.expenseHead}</div>
                  </td>
                  <td className="border-t border-slate-100 py-4">
                    <div className="font-medium text-ink">{expense.vendor}</div>
                    <div className="text-xs text-dusk">{formatDate(expense.invoiceDate)}</div>
                  </td>
                  <td className="border-t border-slate-100 py-4 text-dusk">{expense.branch}</td>
                  <td className="border-t border-slate-100 py-4 font-medium text-ink">
                    {formatCurrency(expense.netAmount)}
                  </td>
                  <td className="border-t border-slate-100 py-4 text-dusk">
                    {formatCurrency(expense.balanceAmount)}
                  </td>
                  <td className="border-t border-slate-100 py-4 text-dusk">
                    {expense.agingDays} days
                  </td>
                  <td className="border-t border-slate-100 py-4">
                    <StatusBadge value={expense.status} />
                  </td>
                  <td className="border-t border-slate-100 py-4">
                    {user?.role === "ADMIN" || user?.role === "FINANCE" ? (
                      <button
                        type="button"
                        className="rounded-2xl border border-slate-200 px-3 py-2 text-xs font-semibold text-ink"
                        onClick={() => {
                          const amount = window.prompt("Settlement amount", String(expense.balanceAmount));
                          if (!amount) return;
                          const reference = window.prompt("Reference / transaction id", "Manual payout");
                          void addSettlement.mutateAsync({
                            expenseId: expense.id,
                            payload: {
                              amount: Number(amount),
                              paidOn: new Date().toISOString(),
                              reference,
                            },
                          });
                        }}
                      >
                        Add payment
                      </button>
                    ) : (
                      <span className="text-xs text-dusk">View only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
