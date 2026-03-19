import { existsSync } from "node:fs";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { importExpensesFromWorkbookPath } from "../modules/expenses/expenses.service.js";
import { importPaymentsFromWorkbookPath } from "../modules/payments/payments.service.js";

async function main() {
  if (env.PAYMENT_WORKBOOK_PATH && existsSync(env.PAYMENT_WORKBOOK_PATH)) {
    const batch = await importPaymentsFromWorkbookPath(env.PAYMENT_WORKBOOK_PATH, {
      source: "EXCEL",
      filename: env.PAYMENT_WORKBOOK_PATH,
    });
    logger.info("Imported payment workbook", batch);
  }

  if (env.EXPENSE_WORKBOOK_PATH && existsSync(env.EXPENSE_WORKBOOK_PATH)) {
    const batch = await importExpensesFromWorkbookPath(env.EXPENSE_WORKBOOK_PATH, {
      source: "EXCEL",
      filename: env.EXPENSE_WORKBOOK_PATH,
    });
    logger.info("Imported expense workbook", batch);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

