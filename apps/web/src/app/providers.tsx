"use client";

import {
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { AuthProvider, useAuth } from "@/components/auth/auth-provider";
import { createQueryClient } from "@/lib/query-client";
import { socket } from "@/lib/socket";

function RealtimeBridge({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      socket.disconnect();
      return;
    }

    socket.connect();
    const invalidateFinance = () => {
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    };

    socket.on("expense.created", invalidateFinance);
    socket.on("expense.updated", invalidateFinance);
    socket.on("approval.updated", invalidateFinance);
    socket.on("payment.updated", invalidateFinance);

    return () => {
      socket.off("expense.created", invalidateFinance);
      socket.off("expense.updated", invalidateFinance);
      socket.off("approval.updated", invalidateFinance);
      socket.off("payment.updated", invalidateFinance);
      socket.disconnect();
    };
  }, [queryClient, token]);

  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RealtimeBridge>{children}</RealtimeBridge>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

