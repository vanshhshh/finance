import type {
  ApprovalStatus,
  ExpenseStatus,
  PaymentCategory,
  PaymentStatus,
  UserRole,
} from "@finance-platform/shared";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  branch?: string | null;
};

export type PaymentRecord = {
  id: string;
  customerCode?: string | null;
  customerName: string;
  customerStatus?: string | null;
  customerCategory: PaymentCategory;
  branch: string;
  invoiceId: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PaymentStatus;
  disputed: boolean;
  futureDue: boolean;
  overdueDays: number;
  updatedAt: string;
};

export type ExpenseApprovalRecord = {
  id: string;
  level: number;
  approverRole: UserRole;
  approverId?: string | null;
  status: ApprovalStatus;
  comments?: string | null;
  actedAt?: string | null;
  approver?: {
    name: string;
    email: string;
  } | null;
};

export type ExpenseRecord = {
  id: string;
  expenseCode: string;
  externalCode?: string | null;
  vendor: string;
  vendorCode?: string | null;
  branch: string;
  expenseHead: string;
  costCategory?: string | null;
  billNumber?: string | null;
  invoiceDate?: string | null;
  dueDate?: string | null;
  amount: number;
  gstAmount: number;
  tdsAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: ExpenseStatus;
  approvalLevel: number;
  attachmentUrl?: string | null;
  description?: string | null;
  agingDays: number;
  lastPaymentDate?: string | null;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  approvedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  approvals: ExpenseApprovalRecord[];
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branch?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

