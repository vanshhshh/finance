import type { ReactNode } from "react";

import { Panel } from "./panel";

export function MetricCard({
  label,
  value,
  accent,
  detail,
}: {
  label: string;
  value: string;
  accent: ReactNode;
  detail?: string;
}) {
  return (
    <Panel className="relative overflow-hidden">
      <div className="absolute right-4 top-4">{accent}</div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-dusk">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold text-ink">{value}</p>
      {detail ? <p className="mt-2 text-sm text-dusk">{detail}</p> : null}
    </Panel>
  );
}

