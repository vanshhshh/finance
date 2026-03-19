import { z } from "zod";

export const userRoleSchema = z.enum([
  "ADMIN",
  "APPROVER1",
  "APPROVER2",
  "APPROVER3",
  "APPROVER4",
  "FINANCE",
]);

export const paymentStatusSchema = z.enum([
  "CURRENT",
  "PARTIAL",
  "OVERDUE",
  "PAID",
  "DISPUTED",
  "FUTURE",
]);

export const paymentCategorySchema = z.enum([
  "ACTIVE",
  "FORMER",
  "DISPUTED",
  "FUTURE",
]);

export const expenseStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "PARTIAL",
  "PAID",
  "UNPAID",
  "VOID",
]);

export const approvalStatusSchema = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SKIPPED",
]);

export const importSourceSchema = z.enum([
  "MANUAL",
  "EXCEL",
  "ZOHO_WEBHOOK",
  "ZOHO_POLL",
]);

export const zohoEventTypeSchema = z.enum([
  "FILE_CREATED",
  "FILE_UPDATED",
  "RECORD_UPDATED",
  "MANUAL_SYNC",
]);

export type UserRole = z.infer<typeof userRoleSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type PaymentCategory = z.infer<typeof paymentCategorySchema>;
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type ImportSource = z.infer<typeof importSourceSchema>;
export type ZohoEventType = z.infer<typeof zohoEventTypeSchema>;

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const paymentFiltersSchema = z.object({
  search: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  category: paymentCategorySchema.optional(),
  status: paymentStatusSchema.optional(),
  minOutstanding: z.coerce.number().nonnegative().optional(),
  maxOutstanding: z.coerce.number().nonnegative().optional(),
  overdueBucket: z.enum(["CURRENT", "30", "60", "90"]).optional(),
  ...paginationSchema.shape,
});

export const expenseFiltersSchema = z.object({
  search: z.string().trim().optional(),
  vendor: z.string().trim().optional(),
  branch: z.string().trim().optional(),
  expenseHead: z.string().trim().optional(),
  status: expenseStatusSchema.optional(),
  minAmount: z.coerce.number().nonnegative().optional(),
  maxAmount: z.coerce.number().nonnegative().optional(),
  agingBucket: z.enum(["CURRENT", "30", "45", "60"]).optional(),
  ...paginationSchema.shape,
});

export const expenseApprovalActionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  comments: z.string().trim().max(500).optional(),
});

export const createExpenseSchema = z.object({
  vendor: z.string().min(2),
  vendorCode: z.string().trim().optional(),
  branch: z.string().min(2),
  expenseHead: z.string().min(2),
  costCategory: z.string().trim().optional(),
  billNumber: z.string().trim().optional(),
  invoiceDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
  amount: z.coerce.number().positive(),
  gstAmount: z.coerce.number().nonnegative().default(0),
  tdsAmount: z.coerce.number().nonnegative().default(0),
  description: z.string().trim().max(500).optional(),
  attachmentUrl: z.string().url().optional(),
});

export const addExpensePaymentSchema = z.object({
  amount: z.coerce.number().positive(),
  paidOn: z.string().datetime(),
  reference: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const updateUserRoleSchema = z.object({
  role: userRoleSchema,
  branch: z.string().trim().optional(),
});

export const authFirebaseSchema = z.object({
  idToken: z.string().min(10),
});

export const webhookSchema = z.object({
  eventType: z.enum(["file_created", "file_updated", "record_updated"]),
  sourceId: z.string().optional(),
  module: z.string().optional(),
  payload: z.record(z.any()).optional(),
});

export type PaymentFilters = z.infer<typeof paymentFiltersSchema>;
export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type AddExpensePaymentInput = z.infer<typeof addExpensePaymentSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type ExpenseApprovalActionInput = z.infer<
  typeof expenseApprovalActionSchema
>;
export type AuthFirebaseInput = z.infer<typeof authFirebaseSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Admin",
  APPROVER1: "Approver 1",
  APPROVER2: "Approver 2",
  APPROVER3: "Approver 3",
  APPROVER4: "Approver 4",
  FINANCE: "Finance",
};

export const approvalRoles: UserRole[] = [
  "APPROVER1",
  "APPROVER2",
  "APPROVER3",
  "APPROVER4",
];

export const expenseStatusColors: Record<ExpenseStatus, string> = {
  PENDING: "amber",
  APPROVED: "sky",
  REJECTED: "rose",
  PARTIAL: "orange",
  PAID: "emerald",
  UNPAID: "slate",
  VOID: "zinc",
};

export const paymentStatusColors: Record<PaymentStatus, string> = {
  CURRENT: "sky",
  PARTIAL: "orange",
  OVERDUE: "rose",
  PAID: "emerald",
  DISPUTED: "amber",
  FUTURE: "violet",
};
