import axios from "axios";

import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { calculateAgingDays, calculateOverdueDays } from "../common/dates.js";
import { toJsonValue } from "../common/json.js";
import { roundCurrency, toNumber } from "../common/numbers.js";
import { emitFinanceEvent } from "../common/socket.js";
import { importExpensesFromWorkbookPath } from "../expenses/expenses.service.js";
import { importPaymentsFromWorkbookPath } from "../payments/payments.service.js";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getZohoAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  if (
    !env.ZOHO_CLIENT_ID ||
    !env.ZOHO_CLIENT_SECRET ||
    !env.ZOHO_REFRESH_TOKEN
  ) {
    throw new Error("Zoho credentials are not configured.");
  }

  const response = await axios.post(
    "https://accounts.zoho.in/oauth/v2/token",
    undefined,
    {
      params: {
        refresh_token: env.ZOHO_REFRESH_TOKEN,
        client_id: env.ZOHO_CLIENT_ID,
        client_secret: env.ZOHO_CLIENT_SECRET,
        grant_type: "refresh_token",
      },
    },
  );

  cachedToken = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000 - 60_000,
  };

  return cachedToken.accessToken;
}

async function zohoGet<T>(url: string, params?: Record<string, string | number>) {
  const accessToken = await getZohoAccessToken();

  const response = await axios.get<T>(`${env.ZOHO_BASE_URL}${url}`, {
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
    },
    params,
  });

  return response.data;
}

async function syncInvoicesFromZoho(source: "ZOHO_WEBHOOK" | "ZOHO_POLL") {
  const response = await zohoGet<{
    invoices?: Array<Record<string, unknown>>;
  }>("/books/v3/invoices", {
    organization_id: env.ZOHO_ORG_ID ?? "",
  });

  const invoices = response.invoices ?? [];
  let count = 0;

  for (const invoice of invoices) {
    const invoiceId = String(
      invoice.invoice_id ?? invoice.id ?? invoice.invoice_number ?? "",
    ).trim();
    if (!invoiceId) continue;

    const amount = roundCurrency(toNumber(invoice.total ?? invoice.bcy_total));
    const outstandingAmount = roundCurrency(
      toNumber(invoice.balance ?? invoice.bcy_balance),
    );
    const paidAmount = roundCurrency(Math.max(amount - outstandingAmount, 0));
    const dueDate = invoice.due_date ? new Date(String(invoice.due_date)) : null;
    const overdueDays = calculateOverdueDays(dueDate, outstandingAmount);
    const disputed = Boolean(invoice.cf_disputed ?? invoice.disputed);
    const futureDue = Boolean(
      overdueDays === 0 && outstandingAmount > 0 && dueDate && dueDate > new Date(),
    );

    await prisma.payment.upsert({
      where: {
        invoiceId,
      },
      update: {
        customerName: String(invoice.customer_name ?? "Unknown Customer"),
        branch: String(invoice.branch_name ?? invoice.branch ?? "Unknown Branch"),
        invoiceNumber: String(invoice.invoice_number ?? ""),
        invoiceDate: invoice.date ? new Date(String(invoice.date)) : null,
        dueDate,
        amount,
        paidAmount,
        outstandingAmount,
        disputed,
        futureDue,
        overdueDays,
        status: disputed
          ? "DISPUTED"
          : outstandingAmount <= 0
            ? "PAID"
            : overdueDays > 0
              ? "OVERDUE"
              : paidAmount > 0
                ? "PARTIAL"
                : futureDue
                  ? "FUTURE"
                  : "CURRENT",
        customerCategory: disputed ? "DISPUTED" : futureDue ? "FUTURE" : "ACTIVE",
        source,
        rawPayload: toJsonValue(invoice),
        lastSyncedAt: new Date(),
      },
      create: {
        invoiceId,
        customerName: String(invoice.customer_name ?? "Unknown Customer"),
        branch: String(invoice.branch_name ?? invoice.branch ?? "Unknown Branch"),
        invoiceNumber: String(invoice.invoice_number ?? ""),
        invoiceDate: invoice.date ? new Date(String(invoice.date)) : null,
        dueDate,
        amount,
        paidAmount,
        outstandingAmount,
        disputed,
        futureDue,
        overdueDays,
        status: disputed
          ? "DISPUTED"
          : outstandingAmount <= 0
            ? "PAID"
            : overdueDays > 0
              ? "OVERDUE"
              : paidAmount > 0
                ? "PARTIAL"
                : futureDue
                  ? "FUTURE"
                  : "CURRENT",
        customerCategory: disputed ? "DISPUTED" : futureDue ? "FUTURE" : "ACTIVE",
        source,
        rawPayload: toJsonValue(invoice),
        lastSyncedAt: new Date(),
      },
    });
    count += 1;
  }

  if (count > 0) {
    emitFinanceEvent("payment.updated", {
      type: "zoho-sync",
      count,
    });
  }

  return count;
}

async function syncBillsFromZoho(source: "ZOHO_WEBHOOK" | "ZOHO_POLL") {
  const response = await zohoGet<{
    bills?: Array<Record<string, unknown>>;
  }>("/books/v3/bills", {
    organization_id: env.ZOHO_ORG_ID ?? "",
  });

  const bills = response.bills ?? [];
  let count = 0;

  for (const bill of bills) {
    const externalCode = String(bill.bill_id ?? bill.id ?? "").trim();
    if (!externalCode) continue;

    const amount = roundCurrency(toNumber(bill.sub_total ?? bill.amount));
    const gstAmount = roundCurrency(toNumber(bill.tax_total ?? 0));
    const tdsAmount = roundCurrency(toNumber(bill.tds_amount ?? 0));
    const netAmount = roundCurrency(toNumber(bill.total ?? amount + gstAmount - tdsAmount));
    const balanceAmount = roundCurrency(toNumber(bill.balance ?? netAmount));
    const paidAmount = roundCurrency(Math.max(netAmount - balanceAmount, 0));
    const invoiceDate = bill.bill_date ? new Date(String(bill.bill_date)) : null;
    const dueDate = bill.due_date ? new Date(String(bill.due_date)) : null;

    const existing = await prisma.expense.findUnique({
      where: {
        externalCode,
      },
    });

    const expense = existing
      ? await prisma.expense.update({
          where: {
            id: existing.id,
          },
          data: {
            expenseCode: existing.expenseCode,
            vendor: String(bill.vendor_name ?? "Unknown Vendor"),
            branch: String(bill.branch_name ?? bill.branch ?? "Unknown Branch"),
            expenseHead: String(bill.account_name ?? bill.expense_head ?? "Imported"),
            billNumber: String(bill.bill_number ?? ""),
            invoiceDate,
            dueDate,
            amount,
            gstAmount,
            tdsAmount,
            netAmount,
            paidAmount,
            balanceAmount,
            agingDays: calculateAgingDays(invoiceDate, balanceAmount),
            status:
              balanceAmount === 0
                ? "PAID"
                : paidAmount > 0
                  ? "PARTIAL"
                  : "UNPAID",
            approvalLevel: 4,
            source,
            rawPayload: toJsonValue(bill),
          },
        })
      : await prisma.expense.create({
          data: {
            expenseCode: `ZOHO-${externalCode}`,
            externalCode,
            vendor: String(bill.vendor_name ?? "Unknown Vendor"),
            branch: String(bill.branch_name ?? bill.branch ?? "Unknown Branch"),
            expenseHead: String(bill.account_name ?? bill.expense_head ?? "Imported"),
            billNumber: String(bill.bill_number ?? ""),
            invoiceDate,
            dueDate,
            amount,
            gstAmount,
            tdsAmount,
            netAmount,
            paidAmount,
            balanceAmount,
            agingDays: calculateAgingDays(invoiceDate, balanceAmount),
            status:
              balanceAmount === 0
                ? "PAID"
                : paidAmount > 0
                  ? "PARTIAL"
                  : "UNPAID",
            approvalLevel: 4,
            source,
            rawPayload: toJsonValue(bill),
            approvals: {
              create: [
                { level: 1, approverRole: "APPROVER1", status: "SKIPPED" },
                { level: 2, approverRole: "APPROVER2", status: "SKIPPED" },
                { level: 3, approverRole: "APPROVER3", status: "SKIPPED" },
                { level: 4, approverRole: "APPROVER4", status: "SKIPPED" },
              ],
            },
          },
        });

    if (expense.status === "PAID" || expense.status === "PARTIAL") {
      await prisma.expenseSettlement.create({
        data: {
          expenseId: expense.id,
          amount: paidAmount,
          paidOn: dueDate ?? invoiceDate ?? new Date(),
          reference: "Zoho Sync",
          notes: "Imported from Zoho Books",
        },
      });
    }

    count += 1;
  }

  if (count > 0) {
    emitFinanceEvent("expense.updated", {
      type: "zoho-sync",
      count,
    });
  }

  return count;
}

export async function handleZohoWebhook(input: {
  eventType: "file_created" | "file_updated" | "record_updated";
  sourceId?: string;
  module?: string;
  payload?: Record<string, unknown>;
}) {
  const event = await prisma.zohoSyncEvent.create({
    data: {
      eventType:
        input.eventType === "file_created"
          ? "FILE_CREATED"
          : input.eventType === "file_updated"
            ? "FILE_UPDATED"
            : "RECORD_UPDATED",
      sourceId: input.sourceId,
      module: input.module,
      payload: toJsonValue(input.payload),
    },
  });

  try {
    const moduleHint = `${input.module ?? ""} ${JSON.stringify(input.payload ?? {})}`.toLowerCase();

    let syncedPayments = 0;
    let syncedExpenses = 0;

    if (moduleHint.includes("invoice") || moduleHint.includes("payment")) {
      syncedPayments = await syncInvoicesFromZoho("ZOHO_WEBHOOK");
    }

    if (moduleHint.includes("bill") || moduleHint.includes("expense")) {
      syncedExpenses = await syncBillsFromZoho("ZOHO_WEBHOOK");
    }

    if (input.eventType !== "record_updated") {
      if (env.PAYMENT_WORKBOOK_PATH) {
        await importPaymentsFromWorkbookPath(env.PAYMENT_WORKBOOK_PATH, {
          source: "ZOHO_WEBHOOK",
          filename: "configured-payment-workbook",
        });
      }
      if (env.EXPENSE_WORKBOOK_PATH) {
        await importExpensesFromWorkbookPath(env.EXPENSE_WORKBOOK_PATH, {
          source: "ZOHO_WEBHOOK",
          filename: "configured-expense-workbook",
        });
      }
    }

    await prisma.zohoSyncEvent.update({
      where: {
        id: event.id,
      },
      data: {
        processed: true,
        syncedAt: new Date(),
        errorMessage: null,
      },
    });

    return {
      eventId: event.id,
      syncedPayments,
      syncedExpenses,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Zoho sync error";
    await prisma.zohoSyncEvent.update({
      where: {
        id: event.id,
      },
      data: {
        processed: false,
        errorMessage: message,
      },
    });
    throw error;
  }
}

export async function pollZohoChanges() {
  if (!env.USE_ZOHO) {
    return {
      enabled: false,
      syncedPayments: 0,
      syncedExpenses: 0,
    };
  }

  logger.info("Running hourly Zoho polling sync");
  const [syncedPayments, syncedExpenses] = await Promise.all([
    syncInvoicesFromZoho("ZOHO_POLL"),
    syncBillsFromZoho("ZOHO_POLL"),
  ]);

  await prisma.zohoSyncEvent.create({
    data: {
      eventType: "MANUAL_SYNC",
      module: "poll",
      processed: true,
      syncedAt: new Date(),
      payload: {
        syncedPayments,
        syncedExpenses,
      },
    },
  });

  return {
    enabled: true,
    syncedPayments,
    syncedExpenses,
  };
}
