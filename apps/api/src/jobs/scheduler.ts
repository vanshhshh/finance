import cron from "node-cron";

import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import {
  calculateAgingDays,
  calculateOverdueDays,
} from "../modules/common/dates.js";
import { sendPendingReminderEmails } from "../modules/notifications/email.service.js";
import { pollZohoChanges } from "../modules/zoho/zoho.service.js";

async function refreshFinanceAging() {
  const [payments, expenses] = await Promise.all([
    prisma.payment.findMany({
      select: {
        id: true,
        dueDate: true,
        outstandingAmount: true,
      },
    }),
    prisma.expense.findMany({
      select: {
        id: true,
        invoiceDate: true,
        balanceAmount: true,
      },
    }),
  ]);

  await Promise.all([
    ...payments.map((payment) =>
      prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          overdueDays: calculateOverdueDays(
            payment.dueDate,
            Number(payment.outstandingAmount),
          ),
        },
      }),
    ),
    ...expenses.map((expense) =>
      prisma.expense.update({
        where: {
          id: expense.id,
        },
        data: {
          agingDays: calculateAgingDays(
            expense.invoiceDate,
            Number(expense.balanceAmount),
          ),
        },
      }),
    ),
  ]);
}

export function startSchedulers() {
  cron.schedule(
    "0 * * * *",
    async () => {
      try {
        await refreshFinanceAging();
        await sendPendingReminderEmails();
        if (env.USE_ZOHO) {
          await pollZohoChanges();
        }
      } catch (error) {
        logger.error("Scheduled job failed", error);
      }
    },
    {
      timezone: env.CRON_TIMEZONE,
    },
  );

  logger.info("Hourly schedulers registered");
}

