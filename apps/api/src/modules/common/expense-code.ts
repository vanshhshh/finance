import dayjs from "dayjs";

import { prisma } from "../../lib/prisma.js";

export async function generateExpenseCode() {
  const prefix = `EXP-${dayjs().format("YYMM")}`;
  const count = await prisma.expense.count({
    where: {
      expenseCode: {
        startsWith: prefix,
      },
    },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

