import { cn } from "@/lib/utils";

const toneMap: Record<string, string> = {
  CURRENT: "bg-sky-100 text-sky-700",
  PARTIAL: "bg-orange-100 text-orange-700",
  OVERDUE: "bg-rose-100 text-rose-700",
  PAID: "bg-emerald-100 text-emerald-700",
  DISPUTED: "bg-amber-100 text-amber-700",
  FUTURE: "bg-violet-100 text-violet-700",
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sky-100 text-sky-700",
  REJECTED: "bg-rose-100 text-rose-700",
  UNPAID: "bg-slate-200 text-slate-700",
  VOID: "bg-zinc-200 text-zinc-700",
  SKIPPED: "bg-slate-100 text-slate-600",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        toneMap[value] ?? "bg-slate-100 text-slate-700",
      )}
    >
      {value}
    </span>
  );
}

