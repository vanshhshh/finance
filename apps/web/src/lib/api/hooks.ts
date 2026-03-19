"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useAuth } from "@/components/auth/auth-provider";
import type {
  AppUser,
  ExpenseRecord,
  PaymentRecord,
} from "@/lib/types";

import { apiClient } from "./client";

type PaginationResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

type PaymentSummaryResponse = {
  cards: Record<string, number>;
  branches: Array<{
    branch: string;
    totalOutstanding: number;
    invoiceCount: number;
  }>;
};

type ExpenseSummaryResponse = Record<string, number>;

type PaymentFilters = {
  search?: string;
  branch?: string;
  category?: string;
  status?: string;
  minOutstanding?: string;
  maxOutstanding?: string;
  overdueBucket?: string;
  page?: number;
  pageSize?: number;
};

type ExpenseFilters = {
  search?: string;
  vendor?: string;
  branch?: string;
  expenseHead?: string;
  status?: string;
  minAmount?: string;
  maxAmount?: string;
  agingBucket?: string;
  page?: number;
  pageSize?: number;
};

function toQueryString(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });
  return params.toString();
}

export function usePayments(filters: PaymentFilters) {
  const { token } = useAuth();
  const query = toQueryString({ page: 1, pageSize: 12, ...filters });
  return useQuery({
    queryKey: ["payments", query],
    enabled: Boolean(token),
    queryFn: () =>
      apiClient.get<PaginationResponse<PaymentRecord>>(`/api/payments?${query}`, {
        token,
      }),
  });
}

export function usePaymentSummary(filters: PaymentFilters) {
  const { token } = useAuth();
  const query = toQueryString({ page: 1, pageSize: 12, ...filters });
  return useQuery({
    queryKey: ["payment-summary", query],
    enabled: Boolean(token),
    queryFn: () =>
      apiClient.get<PaymentSummaryResponse>(`/api/payments/summary?${query}`, {
        token,
      }),
  });
}

export function useExpenses(filters: ExpenseFilters) {
  const { token } = useAuth();
  const query = toQueryString({ page: 1, pageSize: 12, ...filters });
  return useQuery({
    queryKey: ["expenses", query],
    enabled: Boolean(token),
    queryFn: () =>
      apiClient.get<PaginationResponse<ExpenseRecord>>(`/api/expenses?${query}`, {
        token,
      }),
  });
}

export function useExpenseSummary(filters: ExpenseFilters) {
  const { token } = useAuth();
  const query = toQueryString({ page: 1, pageSize: 12, ...filters });
  return useQuery({
    queryKey: ["expense-summary", query],
    enabled: Boolean(token),
    queryFn: () =>
      apiClient.get<ExpenseSummaryResponse>(`/api/expenses/summary?${query}`, {
        token,
      }),
  });
}

export function useApprovalDashboard() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["approvals"],
    enabled: Boolean(token),
    queryFn: () =>
      apiClient.get<{
        pending: Array<{
          id: string;
          level: number;
          status: string;
          expense: ExpenseRecord;
        }>;
        recent: Array<{
          id: string;
          level: number;
          status: string;
          expense: ExpenseRecord;
        }>;
      }>("/api/approvals/dashboard", {
        token,
      }),
  });
}

export function useUsers() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["users"],
    enabled: Boolean(token),
    queryFn: () =>
      apiClient.get<{ users: AppUser[] }>("/api/users", {
        token,
      }),
  });
}

export function useCreateExpense() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiClient.post("/api/expenses", payload, { token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
    },
  });
}

export function useAddExpenseSettlement() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      expenseId,
      payload,
    }: {
      expenseId: string;
      payload: Record<string, unknown>;
    }) =>
      apiClient.post(`/api/expenses/${expenseId}/settlements`, payload, { token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

export function useApproveExpense() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      expenseId,
      level,
      payload,
    }: {
      expenseId: string;
      level: number;
      payload: {
        action: "approve" | "reject";
        comments?: string;
      };
    }) =>
      apiClient.post(`/api/approvals/${expenseId}/${level}`, payload, { token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["approvals"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

export function useImportWorkbook(path: "/api/payments/import" | "/api/expenses/import") {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiClient.post(path, formData, { token });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["payments"] });
      void queryClient.invalidateQueries({ queryKey: ["payment-summary"] });
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expense-summary"] });
    },
  });
}

export function useUpdateUserRole() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      role,
      branch,
    }: {
      userId: string;
      role: string;
      branch?: string;
    }) => apiClient.patch(`/api/users/${userId}`, { role, branch }, { token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
