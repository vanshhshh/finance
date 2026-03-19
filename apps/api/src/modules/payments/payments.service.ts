import { Prisma } from "@prisma/client";
import type { PaymentCategory, PaymentFilters, PaymentStatus } from "@finance-platform/shared";

import { prisma } from "../../lib/prisma.js";
import { chunkArray } from "../common/arrays.js";
import { calculateOverdueDays, excelSerialToDate } from "../common/dates.js";
import { readWorkbookFromBuffer, readWorkbookFromFile, sheetToRows } from "../common/excel.js";
import { toJsonValue } from "../common/json.js";
import { roundCurrency, toNumber } from "../common/numbers.js";

type ParsedPayment = {
  customerCode?: string;
  customerName: string;
  customerStatus?: string;
  customerCategory: PaymentCategory;
  branch: string;
  invoiceId: string;
  invoiceNumber?: string;
  invoiceDate: Date | null;
  dueDate: Date | null;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  status: PaymentStatus;
  disputed: boolean;
  futureDue: boolean;
  overdueDays: number;
  source: "EXCEL" | "ZOHO_POLL" | "ZOHO_WEBHOOK";
  rawPayload: Record<string, unknown>;
};

const paymentSelect = {
  id: true,
  customerCode: true,
  customerName: true,
  customerStatus: true,
  customerCategory: true,
  branch: true,
  invoiceId: true,
  invoiceNumber: true,
  invoiceDate: true,
  dueDate: true,
  amount: true,
  paidAmount: true,
  outstandingAmount: true,
  status: true,
  disputed: true,
  futureDue: true,
  overdueDays: true,
  updatedAt: true,
} satisfies Prisma.PaymentSelect;

const PAYMENT_IMPORT_CONCURRENCY = 1;

export function buildPaymentWhere(filters: PaymentFilters): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = {};

  if (filters.search) {
    where.OR = [
      {
        customerName: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        invoiceNumber: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        invoiceId: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
    ];
  }

  if (filters.branch) {
    where.branch = {
      equals: filters.branch,
      mode: "insensitive",
    };
  }

  if (filters.category) {
    where.customerCategory = filters.category;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.minOutstanding !== undefined || filters.maxOutstanding !== undefined) {
    where.outstandingAmount = {};
    if (filters.minOutstanding !== undefined) {
      where.outstandingAmount.gte = filters.minOutstanding;
    }
    if (filters.maxOutstanding !== undefined) {
      where.outstandingAmount.lte = filters.maxOutstanding;
    }
  }

  if (filters.overdueBucket) {
    if (filters.overdueBucket === "CURRENT") {
      where.overdueDays = 0;
    }
    if (filters.overdueBucket === "30") {
      where.overdueDays = {
        gte: 1,
        lte: 30,
      };
    }
    if (filters.overdueBucket === "60") {
      where.overdueDays = {
        gte: 31,
        lte: 60,
      };
    }
    if (filters.overdueBucket === "90") {
      where.overdueDays = {
        gt: 60,
      };
    }
  }

  return where;
}

function serializePayment(payment: Prisma.PaymentGetPayload<{ select: typeof paymentSelect }>) {
  return {
    ...payment,
    amount: Number(payment.amount),
    paidAmount: Number(payment.paidAmount),
    outstandingAmount: Number(payment.outstandingAmount),
  };
}

export async function listPayments(filters: PaymentFilters) {
  const where = buildPaymentWhere(filters);
  const skip = (filters.page - 1) * filters.pageSize;

  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      select: paymentSelect,
      orderBy: [{ overdueDays: "desc" }, { dueDate: "asc" }, { customerName: "asc" }],
      skip,
      take: filters.pageSize,
    }),
  ]);

  return {
    data: payments.map(serializePayment),
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.ceil(total / filters.pageSize),
    },
  };
}

export async function getPaymentSummary(filters: PaymentFilters) {
  const where = buildPaymentWhere({ ...filters, page: 1, pageSize: 100 });

  const [rows, branches] = await Promise.all([
    prisma.payment.findMany({
      where,
      select: {
        outstandingAmount: true,
        overdueDays: true,
        customerCategory: true,
      },
    }),
    prisma.payment.groupBy({
      by: ["branch"],
      where,
      _sum: {
        outstandingAmount: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _sum: {
          outstandingAmount: "desc",
        },
      },
    }),
  ]);

  const totals = rows.reduce(
    (accumulator, row) => {
      const outstanding = Number(row.outstandingAmount);
      accumulator.totalOutstanding += outstanding;
      if (row.overdueDays > 60) accumulator.overdue60 += outstanding;
      else if (row.overdueDays > 30) accumulator.overdue31To60 += outstanding;
      else if (row.overdueDays > 0) accumulator.overdue1To30 += outstanding;
      else accumulator.current += outstanding;

      if (row.customerCategory === "ACTIVE") accumulator.active += outstanding;
      if (row.customerCategory === "FORMER") accumulator.former += outstanding;
      if (row.customerCategory === "DISPUTED") accumulator.disputed += outstanding;
      if (row.customerCategory === "FUTURE") accumulator.future += outstanding;

      return accumulator;
    },
    {
      totalOutstanding: 0,
      current: 0,
      overdue1To30: 0,
      overdue31To60: 0,
      overdue60: 0,
      active: 0,
      former: 0,
      disputed: 0,
      future: 0,
    },
  );

  return {
    cards: Object.fromEntries(
      Object.entries(totals).map(([key, value]) => [key, roundCurrency(value)]),
    ),
    branches: branches.map((branch) => ({
      branch: branch.branch,
      totalOutstanding: roundCurrency(Number(branch._sum.outstandingAmount ?? 0)),
      invoiceCount: branch._count._all,
    })),
  };
}

export async function exportPayments(filters: PaymentFilters) {
  const where = buildPaymentWhere({ ...filters, page: 1, pageSize: 100 });
  const rows = await prisma.payment.findMany({
    where,
    select: paymentSelect,
    orderBy: [{ branch: "asc" }, { dueDate: "asc" }],
  });

  return rows.map((payment) => ({
    customerName: payment.customerName,
    branch: payment.branch,
    invoiceId: payment.invoiceId,
    invoiceNumber: payment.invoiceNumber ?? "",
    invoiceDate: payment.invoiceDate?.toISOString() ?? "",
    dueDate: payment.dueDate?.toISOString() ?? "",
    amount: Number(payment.amount),
    paidAmount: Number(payment.paidAmount),
    outstandingAmount: Number(payment.outstandingAmount),
    status: payment.status,
    category: payment.customerCategory,
    overdueDays: payment.overdueDays,
  }));
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function inferCategory(input: {
  customerStatus?: string;
  disputed: boolean;
  futureDue: boolean;
}): PaymentCategory {
  if (input.disputed) {
    return "DISPUTED";
  }

  if (input.futureDue) {
    return "FUTURE";
  }

  const status = (input.customerStatus ?? "").toLowerCase();
  if (status.includes("inactive") || status.includes("former") || status.includes("legal")) {
    return "FORMER";
  }

  return "ACTIVE";
}

function inferPaymentStatus(input: {
  disputed: boolean;
  futureDue: boolean;
  amount: number;
  outstandingAmount: number;
  overdueDays: number;
}): PaymentStatus {
  if (input.disputed) {
    return "DISPUTED";
  }
  if (input.futureDue) {
    return "FUTURE";
  }
  if (input.outstandingAmount <= 0) {
    return "PAID";
  }
  if (input.overdueDays > 0) {
    return "OVERDUE";
  }
  if (input.outstandingAmount < input.amount) {
    return "PARTIAL";
  }
  return "CURRENT";
}

function buildPaymentRecordsFromWorkbook(
  workbook: ReturnType<typeof readWorkbookFromBuffer>,
  source: ParsedPayment["source"],
) {
  const customerRows = sheetToRows(workbook, "Customer Balance as per invoice");
  const invoiceRows = sheetToRows(workbook, "Invoice Details");
  const futureRows = sheetToRows(workbook, "AR Future & OS");

  const customerMap = new Map<
    string,
    {
      customerCode?: string;
      customerStatus?: string;
      property?: string;
    }
  >();
  const futureMap = new Map<string, PaymentCategory>();

  for (const row of customerRows) {
    const customerName = normalizeText(row["Display Name"]);
    if (!customerName) continue;
    customerMap.set(customerName.toLowerCase(), {
      customerCode: normalizeText(row["Customer Code"]) || undefined,
      customerStatus:
        normalizeText(row["Status_1"]) || normalizeText(row["Status"]) || undefined,
      property: normalizeText(row["Property"]) || undefined,
    });
  }

  for (const row of futureRows) {
    const party = normalizeText(row["Party"]) || normalizeText(row["Display Name"]);
    if (!party) continue;

    const categoryText = `${normalizeText(row["Category"])} ${normalizeText(
      row["status"],
    )}`.toLowerCase();
    if (categoryText.includes("disputed")) {
      futureMap.set(party.toLowerCase(), "DISPUTED");
      continue;
    }

    const pendingFuture = toNumber(row["Pending for Future Date"]);
    if (
      pendingFuture > 0 ||
      categoryText.includes("future") ||
      categoryText.includes("sd for") ||
      categoryText.includes("tds current")
    ) {
      futureMap.set(party.toLowerCase(), "FUTURE");
    }
  }

  const records: ParsedPayment[] = [];

  for (const row of invoiceRows) {
    const invoiceId = normalizeText(row["invoice_id"]);
    const customerName = normalizeText(row["customer_name"]);

    if (!invoiceId || !customerName) {
      continue;
    }

    const amount = roundCurrency(toNumber(row["bcy_total"]));
    const outstandingAmount = roundCurrency(toNumber(row["bcy_balance"]));
    const paidAmount = roundCurrency(Math.max(amount - outstandingAmount, 0));
    const dueDate =
      excelSerialToDate(row["due_date"]) ??
      excelSerialToDate(row["invoice.CF.Additional Due Dates"]);
    const invoiceDate = excelSerialToDate(row["date"]);
    const customerMeta = customerMap.get(customerName.toLowerCase());
    const futureOrDisputed = futureMap.get(customerName.toLowerCase());
    const disputed =
      normalizeText(row["invoice.CF.Disputed"]) !== "" &&
      normalizeText(row["invoice.CF.Disputed"]) !== "0";
    const futureDue = futureOrDisputed === "FUTURE";
    const customerStatus = customerMeta?.customerStatus;
    const customerCategory =
      futureOrDisputed === "DISPUTED"
        ? "DISPUTED"
        : inferCategory({
            customerStatus,
            disputed,
            futureDue,
          });
    const overdueDays = calculateOverdueDays(dueDate, outstandingAmount);
    const status =
      futureOrDisputed === "DISPUTED"
        ? "DISPUTED"
        : inferPaymentStatus({
            disputed,
            futureDue,
            amount,
            outstandingAmount,
            overdueDays,
          });
    const branch =
      normalizeText(row["Branch Name as per Summary"]) ||
      normalizeText(row["Branch Name as per Invoice details"]) ||
      normalizeText(row["branch_name for Summary"]) ||
      normalizeText(row["branch_name"]) ||
      customerMeta?.property ||
      "Unknown";

    records.push({
      customerCode: customerMeta?.customerCode,
      customerName,
      customerStatus,
      customerCategory,
      branch,
      invoiceId,
      invoiceNumber: normalizeText(row["invoice_number"]) || undefined,
      invoiceDate,
      dueDate,
      amount,
      paidAmount,
      outstandingAmount,
      status,
      disputed: disputed || futureOrDisputed === "DISPUTED",
      futureDue,
      overdueDays,
      source,
      rawPayload: row,
    });
  }

  return records;
}

export async function importPaymentsFromBuffer(
  buffer: Buffer,
  input: {
    source: ParsedPayment["source"];
    filename?: string;
    createdById?: string;
  },
) {
  const workbook = readWorkbookFromBuffer(buffer);
  const records = buildPaymentRecordsFromWorkbook(workbook, input.source);
  return persistPaymentImport(records, input);
}

export async function importPaymentsFromWorkbookPath(
  path: string,
  input: {
    source: ParsedPayment["source"];
    filename?: string;
    createdById?: string;
  },
) {
  const workbook = readWorkbookFromFile(path);
  const records = buildPaymentRecordsFromWorkbook(workbook, input.source);
  return persistPaymentImport(records, input);
}

async function persistPaymentImport(
  records: ParsedPayment[],
  input: {
    source: ParsedPayment["source"];
    filename?: string;
    createdById?: string;
  },
) {
  const batch = await prisma.importBatch.create({
    data: {
      module: "payments",
      source: input.source,
      filename: input.filename,
      records: records.length,
      createdById: input.createdById,
    },
  });

  let succeeded = 0;
  let failed = 0;

  for (const group of chunkArray(records, PAYMENT_IMPORT_CONCURRENCY)) {
    const results = await Promise.allSettled(
      group.map(async (record) => {
        const payload = {
          customerCode: record.customerCode,
          customerName: record.customerName,
          customerStatus: record.customerStatus,
          customerCategory: record.customerCategory,
          branch: record.branch,
          invoiceNumber: record.invoiceNumber,
          invoiceDate: record.invoiceDate,
          dueDate: record.dueDate,
          amount: record.amount,
          paidAmount: record.paidAmount,
          outstandingAmount: record.outstandingAmount,
          status: record.status,
          disputed: record.disputed,
          futureDue: record.futureDue,
          overdueDays: record.overdueDays,
          source: record.source,
          rawPayload: toJsonValue(record.rawPayload),
          lastSyncedAt: new Date(),
        };

        await prisma.payment.upsert({
          where: {
            invoiceId: record.invoiceId,
          },
          update: payload,
          create: {
            ...payload,
            invoiceId: record.invoiceId,
          },
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
      notes: `Imported ${succeeded} payment rows`,
    },
  });
}
