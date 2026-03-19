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
import { AlertTriangle, Download, Landmark, UploadCloud } from "lucide-react";

import { useAuth } from "@/components/auth/auth-provider";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  useImportWorkbook,
  usePayments,
  usePaymentSummary,
} from "@/lib/api/hooks";
import { webEnv } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";

const ChartBar = Bar as any;
const ChartBarChart = BarChart as any;
const ChartTooltip = Tooltip as any;
const ChartXAxis = XAxis as any;
const ChartYAxis = YAxis as any;

export default function PaymentsPage() {
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [overdueBucket, setOverdueBucket] = useState("");
  const { token } = useAuth();

  const filters = {
    search,
    branch,
    category,
    status,
    overdueBucket,
  };

  const payments = usePayments(filters);
  const summary = usePaymentSummary(filters);
  const importMutation = useImportWorkbook("/api/payments/import");

  const branchData = (summary.data?.branches ?? []) as Array<{
    branch: string;
    totalOutstanding: number;
  }>;
  const cards = (summary.data?.cards ?? {}) as Record<string, number>;

  const handleExport = async () => {
    if (!token) return;
    const query = new URLSearchParams({
      page: "1",
      pageSize: "100",
      ...(search ? { search } : {}),
      ...(branch ? { branch } : {}),
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(overdueBucket ? { overdueBucket } : {}),
    });
    const response = await fetch(`${webEnv.apiUrl}/api/payments/export?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payments.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-dusk">
            AR dashboard
          </p>
          <h1 className="mt-2 font-[var(--font-space)] text-4xl font-semibold">
            Payment collections
          </h1>
          <p className="mt-2 text-sm text-dusk">
            Monitor invoice-level receivables, branch exposure, and overdue drift in one place.
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
          label="Total Outstanding"
          value={formatCurrency(cards.totalOutstanding ?? 0)}
          detail="Live branch and invoice exposure"
          accent={<Landmark className="h-9 w-9 rounded-2xl bg-mint/15 p-2 text-tide" />}
        />
        <MetricCard
          label="1-30 Days"
          value={formatCurrency(cards.overdue1To30 ?? 0)}
          detail="Soft overdue"
          accent={<AlertTriangle className="h-9 w-9 rounded-2xl bg-amber-100 p-2 text-amber-700" />}
        />
        <MetricCard
          label="31-60 Days"
          value={formatCurrency(cards.overdue31To60 ?? 0)}
          detail="Needs follow-up"
          accent={<AlertTriangle className="h-9 w-9 rounded-2xl bg-orange-100 p-2 text-orange-700" />}
        />
        <MetricCard
          label="60+ Days"
          value={formatCurrency(cards.overdue60 ?? 0)}
          detail="Critical aging bucket"
          accent={<AlertTriangle className="h-9 w-9 rounded-2xl bg-rose-100 p-2 text-rose-700" />}
        />
      </div>

      <Panel className="grid gap-3 lg:grid-cols-5">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer or invoice"
        />
        <select value={branch} onChange={(event) => setBranch(event.target.value)}>
          <option value="">All branches</option>
          {branchData.map((item) => (
            <option key={item.branch} value={item.branch}>
              {item.branch}
            </option>
          ))}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          <option value="ACTIVE">Active customers</option>
          <option value="FORMER">Former customers</option>
          <option value="DISPUTED">Disputed customers</option>
          <option value="FUTURE">Future customers</option>
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="CURRENT">Current</option>
          <option value="PARTIAL">Partial</option>
          <option value="OVERDUE">Overdue</option>
          <option value="PAID">Paid</option>
          <option value="DISPUTED">Disputed</option>
          <option value="FUTURE">Future</option>
        </select>
        <select
          value={overdueBucket}
          onChange={(event) => setOverdueBucket(event.target.value)}
        >
          <option value="">All aging buckets</option>
          <option value="CURRENT">Current</option>
          <option value="30">1-30</option>
          <option value="60">31-60</option>
          <option value="90">60+</option>
        </select>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Branch-wise outstanding</p>
              <p className="text-sm text-dusk">
                Highest exposure branches surface first for collection planning.
              </p>
            </div>
          </div>
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ChartBarChart data={branchData.slice(0, 8)}>
                <ChartXAxis dataKey="branch" hide />
                <ChartYAxis hide />
                <ChartTooltip formatter={(value: number) => formatCurrency(value)} />
                <ChartBar dataKey="totalOutstanding" fill="#0E3B43" radius={[12, 12, 0, 0]} />
              </ChartBarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-3">
            {branchData.slice(0, 6).map((item) => (
              <div key={item.branch} className="flex items-center justify-between text-sm">
                <span className="text-dusk">{item.branch}</span>
                <span className="font-semibold text-ink">
                  {formatCurrency(item.totalOutstanding)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">Invoice-wise receivables</p>
              <p className="text-sm text-dusk">
                Over 30 days turns orange. Over 60 days turns red.
              </p>
            </div>
            <p className="text-sm text-dusk">
              {payments.data?.pagination.total ?? 0} invoices
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-dusk">
                <tr>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Branch</th>
                  <th className="pb-3">Invoice</th>
                  <th className="pb-3">Outstanding</th>
                  <th className="pb-3">Overdue</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.data?.data.map((payment) => (
                  <tr
                    key={payment.id}
                    className={
                      payment.overdueDays > 60
                        ? "bg-rose-50/70"
                        : payment.overdueDays > 30
                          ? "bg-orange-50/70"
                          : ""
                    }
                  >
                    <td className="border-t border-slate-100 py-4">
                      <div className="font-medium text-ink">{payment.customerName}</div>
                      <div className="text-xs text-dusk">{payment.customerCategory}</div>
                    </td>
                    <td className="border-t border-slate-100 py-4 text-dusk">
                      {payment.branch}
                    </td>
                    <td className="border-t border-slate-100 py-4">
                      <div className="font-medium text-ink">
                        {payment.invoiceNumber || payment.invoiceId}
                      </div>
                      <div className="text-xs text-dusk">{payment.invoiceId}</div>
                    </td>
                    <td className="border-t border-slate-100 py-4 font-medium text-ink">
                      {formatCurrency(payment.outstandingAmount)}
                    </td>
                    <td className="border-t border-slate-100 py-4 text-dusk">
                      {payment.overdueDays} days
                    </td>
                    <td className="border-t border-slate-100 py-4">
                      <StatusBadge value={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
