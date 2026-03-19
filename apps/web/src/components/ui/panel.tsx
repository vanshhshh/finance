import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/70 bg-white/85 p-5 shadow-panel backdrop-blur",
        className,
      )}
    >
      {children}
    </div>
  );
}

