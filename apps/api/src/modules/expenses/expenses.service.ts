import {
  Prisma,
  type ApprovalStatus,
  type ExpenseStatus,
  type UserRole,
} from "@prisma/client";
import {
  approvalRoles,
  type AddExpensePaymentInput,
  type CreateExpenseInput,
  type ExpenseApprovalActionInput,
  type ExpenseFilters,
} from "@finance-platform/shared";

import { prisma } from "../../lib/prisma.js";
import { createAuditLog } from "../audit/audit.service.js";
import { chunkArray } from "../common/arrays.js";
import { calculateAgingDays, excelSerialToDate } from "../common/dates.js";
import { generateExpenseCode } from "../common/expense-code.js";
import { readWorkbookFromBuffer, readWorkbookFromFile, sheetToRows } from "../common/excel.js";
import { toJsonValue } from "../common/json.js";
import { roundCurrency, toNumber } from "../common/numbers.js";
import { emitFinanceEvent } from "../common/socket.js";
import {
  notifyExpenseCreated,
  notifyNextApprover,
} from "../notifications/email.service.js";

const expenseSelect = {
  id: true,
  expenseCode: true,
  externalCode: true,
  vendor: true,
  vendorCode: true,
  branch: true,
  expenseHead: true,
  costCategory: true,
  billNumber: true,
  invoiceDate: true,
  dueDate: true,
  amount: true,
  gstAmount: true,
  tdsAmount: true,
  netAmount: true,
  paidAmount: true,
  balanceAmount: true,
  status: true,
  approvalLevel: true,
  attachmentUrl: true,
  description: true,
  agingDays: true,
  lastPaymentDate: true,
  createdAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  approvals: {
    orderBy: {
      level: "asc",
    },
    select: {
      id: true,
      level: true,
      approverRole: true,
      approverId: true,
      status: true,
      comments: true,
      actedAt: true,
      approver: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.ExpenseSelect;

const EXPENSE_IMPORT_CONCURRENCY = 5;

function serializeExpense(expense: Prisma.ExpenseGetPayload<{ select: typeof expenseSelect }>) {
  return {
    ...expense,
    amount: Number(expense.amount),
    gstAmount: Number(expense.gstAmount),
    tdsAmount: Number(expense.tdsAmount),
    netAmount: Number(expense.netAmount),
    paidAmount: Number(expense.paidAmount),
    balanceAmount: Number(expense.balanceAmount),
  };
}

export function buildExpenseWhere(filters: ExpenseFilters): Prisma.ExpenseWhereInput {
  const where: Prisma.ExpenseWhereInput = {};

  if (filters.search) {
    where.OR = [
      {
        expenseCode: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        vendor: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        billNumber: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (filters.vendor) {
    where.vendor = {
      contains: filters.vendor,
      mode: "insensitive",
    };
  }

  if (filters.branch) {
    where.branch = {
      equals: filters.branch,
      mode: "insensitive",
    };
  }

  if (filters.expenseHead) {
    where.expenseHead = {
      contains: filters.expenseHead,
      mode: "insensitive",
    };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
    where.netAmount = {};
    if (filters.minAmount !== undefined) {
      where.netAmount.gte = filters.minAmount;
    }
    if (filters.maxAmount !== undefined) {
      where.netAmount.lte = filters.maxAmount;
    }
  }

  if (filters.agingBucket) {
    if (filters.agingBucket === "CURRENT") {
      where.agingDays = {
        lte: 29,
      };
    }
    if (filters.agingBucket === "30") {
      where.agingDays = {
        gte: 30,
        lte: 44,
      };
    }
    if (filters.agingBucket === "45") {
      where.agingDays = {
        gte: 45,
        lte: 59,
      };
    }
    if (filters.agingBucket === "60") {
      where.agingDays = {
        gte: 60,
      };
    }
  }

  return where;
}

export async function listExpenses(filters: ExpenseFilters) {
  const where = buildExpenseWhere(filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      select: expenseSelect,
      orderBy: [{ createdAt: "desc" }, { expenseCode: "desc" }],
      skip,
      take: filters.pageSize,
    }),
  ]);

  return {
    data: expenses.map(serializeExpense),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.ceil(total / filters.pageSize),
    },
  };
}

export async function getExpenseSummary(filters: ExpenseFilters) {
  const where = buildExpenseWhere({ ...filters, page: 1, pageSize: 100 });
  const rows = await prisma.expense.findMany({
    where,
    select: {
      netAmount: true,
      paidAmount: true,
      balanceAmount: true,
      status: true,
      agingDays: true,
    },
  });

  const summary = rows.reduce(
    (accumulator, row) => {
      const netAmount = Number(row.netAmount);
      const paidAmount = Number(row.paidAmount);
      const balanceAmount = Number(row.balanceAmount);

      accumulator.totalAmount += netAmount;
      accumulator.totalPaid += paidAmount;
      accumulator.totalOutstanding += balanceAmount;

      if (row.status === "PENDING") accumulator.pending += 1;
      if (row.status === "UNPAID") accumulator.approved += 1;
      if (row.status === "PAID") accumulator.paid += 1;
      if (row.status === "PARTIAL") accumulator.partial += 1;
      if (row.status === "REJECTED") accumulator.rejected += 1;

      if (row.agingDays >= 60) accumulator.aging60 += balanceAmount;
      else if (row.agingDays >= 45) accumulator.aging45 += balanceAmount;
      else if (row.agingDays >= 30) accumulator.aging30 += balanceAmount;
      else accumulator.agingCurrent += balanceAmount;

      return accumulator;
    },
    {
      totalAmount: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      partial: 0,
      rejected: 0,
      agingCurrent: 0,
      aging30: 0,
      aging45: 0,
      aging60: 0,
    },
  );

  return Object.fromEntries(
    Object.entries(summary).map(([key, value]) => [
      key,
      typeof value === "number" ? roundCurrency(value) : value,
    ]),
  );
}

export async function exportExpenses(filters: ExpenseFilters) {
  const where = buildExpenseWhere({ ...filters, page: 1, pageSize: 100 });
  const expenses = await prisma.expense.findMany({
    where,
    select: expenseSelect,
    orderBy: [{ branch: "asc" }, { createdAt: "desc" }],
  });

  return expenses.map((expense) => ({
    expenseCode: expense.expenseCode,
    vendor: expense.vendor,
    branch: expense.branch,
    expenseHead: expense.expenseHead,
    status: expense.status,
    approvalLevel: expense.approvalLevel,
    amount: Number(expense.amount),
    netAmount: Number(expense.netAmount),
    paidAmount: Number(expense.paidAmount),
    balanceAmount: Number(expense.balanceAmount),
    agingDays: expense.agingDays,
  }));
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function parseApprovalStatus(value: unknown) {
  const normalized = normalizeText(value).toLowerCase();
  if (normalized.includes("reject")) return "REJECTED" as const;
  if (normalized.includes("approve")) return "APPROVED" as const;
  if (normalized.includes("not under")) return "SKIPPED" as const;
  return "PENDING" as const;
}

function buildApprovalStages() {
  return approvalRoles.map((role, index) => ({
    level: index + 1,
    approverRole: role,
    status: "PENDING" as const,
  }));
}

function calculateExpenseWorkflowState(input: {
  approvalStatuses: Array<"PENDING" | "APPROVED" | "REJECTED" | "SKIPPED">;
  paidAmount: number;
  netAmount: number;
  balanceAmount: number;
  isVoid: boolean;
}) {
  if (input.isVoid) {
    return {
      status: "VOID" as const,
      approvalLevel: 1,
    };
  }

  const rejectedIndex = input.approvalStatuses.findIndex((status) => status === "REJECTED");
  if (rejectedIndex >= 0) {
    return {
      status: "REJECTED" as const,
      approvalLevel: rejectedIndex + 1,
    };
  }

  if (input.paidAmount >= input.netAmount && input.netAmount > 0) {
    return {
      status: "PAID" as const,
      approvalLevel: 4,
    };
  }

  if (input.paidAmount > 0 && input.balanceAmount > 0) {
    return {
      status: "PARTIAL" as const,
      approvalLevel: 4,
    };
  }

  const firstPendingIndex = input.approvalStatuses.findIndex(
    (status) => status === "PENDING",
  );
  if (firstPendingIndex >= 0) {
    return {
      status: "PENDING" as const,
      approvalLevel: firstPendingIndex + 1,
    };
  }

  return {
    status: "UNPAID" as const,
    approvalLevel: 4,
  };
}

export async function createExpense(
  input: CreateExpenseInput,
  actor: {
    userId?: string;
    email?: string;
  },
) {
  const amount = roundCurrency(input.amount);
  const gstAmount = roundCurrency(input.gstAmount ?? 0);
  const tdsAmount = roundCurrency(input.tdsAmount ?? 0);
  const netAmount = roundCurrency(amount + gstAmount - tdsAmount);
  const balanceAmount = netAmount;
  const expenseCode = await generateExpenseCode();

  const expense = await prisma.expense.create({
    data: {
      expenseCode,
      vendor: input.vendor,
      vendorCode: input.vendorCode,
      branch: input.branch,
      expenseHead: input.expenseHead,
      costCategory: input.costCategory,
      billNumber: input.billNumber,
      invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      amount,
      gstAmount,
      tdsAmount,
      netAmount,
      paidAmount: 0,
      balanceAmount,
      status: "PENDING",
      approvalLevel: 1,
      attachmentUrl: input.attachmentUrl,
      description: input.description,
      agingDays: calculateAgingDays(
        input.invoiceDate ? new Date(input.invoiceDate) : null,
        balanceAmount,
      ),
      source: "MANUAL",
      createdById: actor.userId,
      approvals: {
        create: buildApprovalStages(),
      },
    },
    select: expenseSelect,
  });

  await createAuditLog({
    entityType: "expense",
    entityId: expense.id,
    action: "expense.created",
    actorId: actor.userId,
    actorEmail: actor.email,
    metadata: {
      expenseCode,
      vendor: input.vendor,
      amount: netAmount,
    },
  });

  emitFinanceEvent("expense.created", {
    expenseId: expense.id,
    expenseCode: expense.expenseCode,
  });

  await notifyExpenseCreated({
    expenseCode: expense.expenseCode,
    vendor: expense.vendor,
    branch: expense.branch,
    amount: Number(expense.netAmount).toFixed(2),
  });

  return serializeExpense(expense);
}

export async function addExpenseSettlement(
  expenseId: string,
  input: AddExpensePaymentInput,
  actor: {
    userId?: string;
    email?: string;
  },
) {
  const expense = await prisma.expense.findUniqueOrThrow({
    where: {
      id: expenseId,
    },
  });

  const settlementAmount = roundCurrency(input.amount);
  const nextPaidAmount = roundCurrency(Number(expense.paidAmount) + settlementAmount);
  const nextBalanceAmount = roundCurrency(
    Math.max(Number(expense.netAmount) - nextPaidAmount, 0),
  );
  const nextStatus =
    nextBalanceAmount === 0 ? "PAID" : nextPaidAmount > 0 ? "PARTIAL" : expense.status;

  const updatedExpense = await prisma.$transaction(async (transaction) => {
    await transaction.expenseSettlement.create({
      data: {
        expenseId,
        amount: settlementAmount,
        paidOn: new Date(input.paidOn),
        reference: input.reference,
        notes: input.notes,
        createdById: actor.userId,
      },
    });

    return transaction.expense.update({
      where: {
        id: expenseId,
      },
      data: {
        paidAmount: nextPaidAmount,
        balanceAmount: nextBalanceAmount,
        lastPaymentDate: new Date(input.paidOn),
        status: nextStatus,
      },
      select: expenseSelect,
    });
  });

  await createAuditLog({
    entityType: "expense",
    entityId: expenseId,
    action: "expense.settlement.added",
    actorId: actor.userId,
    actorEmail: actor.email,
    metadata: input,
  });

  emitFinanceEvent("expense.updated", {
    expenseId,
    status: updatedExpense.status,
  });

  return serializeExpense(updatedExpense);
}

export async function getApprovalDashboard(role: string, userId?: string) {
  const pendingWhere: Prisma.ExpenseApprovalWhereInput =
    role === "ADMIN"
      ? {
          status: "PENDING",
        }
      : {
          approverRole: role as UserRole,
          status: "PENDING",
        };

  const [pendingApprovals, recentlyApproved] = await Promise.all([
    prisma.expenseApproval.findMany({
      where: pendingWhere,
      include: {
        expense: {
          select: expenseSelect,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.expenseApproval.findMany({
      where: role === "ADMIN" ? { status: "APPROVED" } : { approverId: userId, status: "APPROVED" },
      include: {
        expense: {
          select: expenseSelect,
        },
      },
      orderBy: {
        actedAt: "desc",
      },
      take: 10,
    }),
  ]);

  return {
    pending: pendingApprovals.map((item) => ({
      ...item,
      expense: serializeExpense(item.expense),
    })),
    recent: recentlyApproved.map((item) => ({
      ...item,
      expense: serializeExpense(item.expense),
    })),
  };
}

export async function processApprovalAction(
  expenseId: string,
  level: number,
  input: ExpenseApprovalActionInput,
  actor: {
    userId: string;
    email: string;
    role: string;
  },
) {
  const approval = await prisma.expenseApproval.findFirstOrThrow({
    where: {
      expenseId,
      level,
    },
    include: {
      expense: {
        select: expenseSelect,
      },
    },
  });

  if (actor.role !== "ADMIN" && approval.approverRole !== actor.role) {
    throw new Error("You are not allowed to act on this approval.");
  }

  if (approval.status !== "PENDING") {
    throw new Error("This approval step has already been processed.");
  }

  const isApproved = input.action === "approve";
  const nextApproval = approval.expense.approvals.find(
    (item) => item.level === level + 1,
  );

  const updatedExpense = await prisma.$transaction(async (transaction) => {
    await transaction.expenseApproval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: isApproved ? "APPROVED" : "REJECTED",
        comments: input.comments,
        actedAt: new Date(),
        approverId: actor.userId,
      },
    });

    if (!isApproved) {
      return transaction.expense.update({
        where: {
          id: expenseId,
        },
        data: {
          status: "REJECTED",
          approvalLevel: level,
        },
        select: expenseSelect,
      });
    }

    if (nextApproval) {
      await transaction.expenseApproval.update({
        where: {
          id: nextApproval.id,
        },
        data: {
          notifiedAt: new Date(),
        },
      });
    }

    return transaction.expense.update({
      where: {
        id: expenseId,
      },
      data: {
        approvalLevel: nextApproval?.level ?? 4,
        status: nextApproval ? "PENDING" : "UNPAID",
        approvedById: nextApproval ? undefined : actor.userId,
      },
      select: expenseSelect,
    });
  });

  await createAuditLog({
    entityType: "expense",
    entityId: expenseId,
    action: `expense.approval.${input.action}`,
    actorId: actor.userId,
    actorEmail: actor.email,
    metadata: {
      level,
      comments: input.comments,
    },
  });

  if (isApproved && nextApproval) {
    await notifyNextApprover({
      expenseCode: updatedExpense.expenseCode,
      level: nextApproval.level,
      vendor: updatedExpense.vendor,
      amount: Number(updatedExpense.netAmount).toFixed(2),
    });
  }

  emitFinanceEvent("approval.updated", {
    expenseId,
    level,
    action: input.action,
    status: updatedExpense.status,
  });

  return serializeExpense(updatedExpense);
}

type ParsedImportedExpense = {
  expenseCode: string;
  externalCode?: string;
  vendor: string;
  vendorCode?: string;
  branch: string;
  expenseHead: string;
  costCategory?: string;
  billNumber?: string;
  invoiceDate: Date | null;
  amount: number;
  gstAmount: number;
  tdsAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: ExpenseStatus;
  approvalLevel: number;
  attachmentUrl?: string;
  description?: string;
  agingDays: number;
  source: "EXCEL" | "ZOHO_POLL" | "ZOHO_WEBHOOK";
  approvals: Array<{
    level: number;
    approverRole: UserRole;
    status: ApprovalStatus;
  }>;
  rawPayload: Record<string, unknown>;
};

function buildExpenseRecordsFromWorkbook(
  workbook: ReturnType<typeof readWorkbookFromBuffer>,
  source: ParsedImportedExpense["source"],
) {
  const rows = sheetToRows(workbook, "expense master sheet");
  const records: ParsedImportedExpense[] = [];

  for (const row of rows) {
    const externalCode = normalizeText(row["Unique Code"]);
    const expenseCode = externalCode || normalizeText(row["Master Code"]);

    if (!expenseCode) {
      continue;
    }

    const amount = roundCurrency(toNumber(row["Expense Amount "]));
    const gstAmount = roundCurrency(toNumber(row["GST"]));
    const tdsAmount = roundCurrency(toNumber(row["TDS Deducted"]));
    const netAmount = roundCurrency(
      toNumber(row["Net Amount to be Paid"]) || amount + gstAmount - tdsAmount,
    );
    const balanceAmount = roundCurrency(toNumber(row["Balance Amount"]));
    const paidAmount = roundCurrency(Math.max(netAmount - balanceAmount, 0));

    const approvalStatuses = [
      parseApprovalStatus(row["Approval by IT Manager"]),
      parseApprovalStatus(row["Approval by Cluster Manager Services"]),
      parseApprovalStatus(row["Approval by Cluster Manager"]),
      parseApprovalStatus(row["Approval by Operations Head"]),
    ];
    const workflow = calculateExpenseWorkflowState({
      approvalStatuses,
      paidAmount,
      netAmount,
      balanceAmount,
      isVoid:
        normalizeText(row["Valid/Void"]).toLowerCase().includes("void") ||
        normalizeText(row["Paid / Unpaid/Void"]).toLowerCase().includes("void"),
    });

    records.push({
      expenseCode,
      externalCode: externalCode || undefined,
      vendor: normalizeText(row["Name of the Vendor"]) || "Unknown Vendor",
      vendorCode: normalizeText(row["Vendor Code"]) || undefined,
      branch: normalizeText(row["Cost Centre"]) || "Unknown Branch",
      expenseHead: normalizeText(row["Expense Head"]) || "Unclassified",
      costCategory: normalizeText(row["Cost Category"]) || undefined,
      billNumber: normalizeText(row["Bill Number"]) || undefined,
      invoiceDate: excelSerialToDate(row["Invoice Date"]),
      amount,
      gstAmount,
      tdsAmount,
      netAmount,
      paidAmount,
      balanceAmount,
      status: workflow.status,
      approvalLevel: workflow.approvalLevel,
      attachmentUrl: normalizeText(row["Link "]) || undefined,
      description: normalizeText(row["Comments By Opreations"]) || undefined,
      agingDays: calculateAgingDays(excelSerialToDate(row["Invoice Date"]), balanceAmount),
      source,
      approvals: approvalRoles.map((role, index) => ({
        level: index + 1,
        approverRole: role as UserRole,
        status: approvalStatuses[index],
      })),
      rawPayload: row,
    });
  }

  return records;
}

async function persistExpenseImport(
  records: ParsedImportedExpense[],
  input: {
    filename?: string;
    createdById?: string;
    source: ParsedImportedExpense["source"];
  },
) {
  const batch = await prisma.importBatch.create({
    data: {
      module: "expenses",
      source: input.source,
      filename: input.filename,
      records: records.length,
      createdById: input.createdById,
    },
  });

  let succeeded = 0;
  let failed = 0;

  for (const group of chunkArray(records, EXPENSE_IMPORT_CONCURRENCY)) {
    const results = await Promise.allSettled(
      group.map(async (record) => {
        await prisma.$transaction(async (transaction) => {
          const expenseWhere: Prisma.ExpenseWhereUniqueInput = record.externalCode
            ? {
                externalCode: record.externalCode,
              }
            : {
                expenseCode: record.expenseCode,
              };

          const payload = {
            expenseCode: record.expenseCode,
            externalCode: record.externalCode,
            vendor: record.vendor,
            vendorCode: record.vendorCode,
            branch: record.branch,
            expenseHead: record.expenseHead,
            costCategory: record.costCategory,
            billNumber: record.billNumber,
            invoiceDate: record.invoiceDate,
            amount: record.amount,
            gstAmount: record.gstAmount,
            tdsAmount: record.tdsAmount,
            netAmount: record.netAmount,
            paidAmount: record.paidAmount,
            balanceAmount: record.balanceAmount,
            status: record.status,
            approvalLevel: record.approvalLevel,
            attachmentUrl: record.attachmentUrl,
            description: record.description,
            agingDays: record.agingDays,
            source: record.source,
            rawPayload: toJsonValue(record.rawPayload),
          };

          const expense = await transaction.expense.upsert({
            where: expenseWhere,
            update: payload,
            create: payload,
          });

          await transaction.expenseApproval.deleteMany({
            where: {
              expenseId: expense.id,
            },
          });

          await transaction.expenseApproval.createMany({
            data: record.approvals.map((approval) => ({
              expenseId: expense.id,
              level: approval.level,
              approverRole: approval.approverRole,
              status: approval.status,
            })),
          });
        });
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        succeeded += 1;
        continue;
      }

      failed += 1;
    }
  }

  return prisma.importBatch.update({
    where: {
      id: batch.id,
    },
    data: {
      succeeded,
      failed,
      notes: `Imported ${succeeded} expense rows`,
    },
  });
}

export async function importExpensesFromBuffer(
  buffer: Buffer,
  input: {
    filename?: string;
    createdById?: string;
    source: ParsedImportedExpense["source"];
  },
) {
  const workbook = readWorkbookFromBuffer(buffer);
  const records = buildExpenseRecordsFromWorkbook(workbook, input.source);
  return persistExpenseImport(records, input);
}

export async function importExpensesFromWorkbookPath(
  path: string,
  input: {
    filename?: string;
    createdById?: string;
    source: ParsedImportedExpense["source"];
  },
) {
  const workbook = readWorkbookFromFile(path);
  const records = buildExpenseRecordsFromWorkbook(workbook, input.source);
  return persistExpenseImport(records, input);
}
