import { Router } from "express";

import {
  addExpensePaymentSchema,
  createExpenseSchema,
  expenseFiltersSchema,
} from "@finance-platform/shared";

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../../middleware/auth.js";
import { validateBody, validateQuery } from "../../middleware/validate.js";
import { createAuditLog } from "../audit/audit.service.js";
import { toCsv } from "../common/csv.js";
import { emitFinanceEvent } from "../common/socket.js";
import { upload } from "../uploads/upload.js";
import {
  addExpenseSettlement,
  createExpense,
  exportExpenses,
  getExpenseSummary,
  importExpensesFromBuffer,
  listExpenses,
} from "./expenses.service.js";

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get(
  "/",
  requireRole(["ADMIN", "FINANCE", "APPROVER1", "APPROVER2", "APPROVER3", "APPROVER4"]),
  validateQuery(expenseFiltersSchema),
  async (request, response, next) => {
    try {
      const result = await listExpenses(request.query as typeof request.query & {
        page: number;
        pageSize: number;
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

expensesRouter.get(
  "/summary",
  requireRole(["ADMIN", "FINANCE", "APPROVER1", "APPROVER2", "APPROVER3", "APPROVER4"]),
  validateQuery(expenseFiltersSchema),
  async (request, response, next) => {
    try {
      const summary = await getExpenseSummary(request.query as typeof request.query & {
        page: number;
        pageSize: number;
      });
      response.json(summary);
    } catch (error) {
      next(error);
    }
  },
);

expensesRouter.get(
  "/export",
  requireRole(["ADMIN", "FINANCE"]),
  validateQuery(expenseFiltersSchema),
  async (request, response, next) => {
    try {
      const rows = await exportExpenses(request.query as typeof request.query & {
        page: number;
        pageSize: number;
      });
      response.setHeader("Content-Type", "text/csv");
      response.setHeader("Content-Disposition", "attachment; filename=expenses.csv");
      response.send(toCsv(rows));
    } catch (error) {
      next(error);
    }
  },
);

expensesRouter.post(
  "/",
  requireRole(["ADMIN", "FINANCE"]),
  validateBody(createExpenseSchema),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const expense = await createExpense(request.body, {
        userId: request.user?.userId,
        email: request.user?.email,
      });
      response.status(201).json({
        expense,
      });
    } catch (error) {
      next(error);
    }
  },
);

expensesRouter.post(
  "/:id/settlements",
  requireRole(["ADMIN", "FINANCE"]),
  validateBody(addExpensePaymentSchema),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const expense = await addExpenseSettlement(String(request.params.id), request.body, {
        userId: request.user?.userId,
        email: request.user?.email,
      });
      response.status(201).json({
        expense,
      });
    } catch (error) {
      next(error);
    }
  },
);

expensesRouter.post(
  "/import",
  requireRole(["ADMIN", "FINANCE"]),
  upload.single("file"),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      if (!request.file) {
        return response.status(400).json({ message: "Excel file is required" });
      }

      const batch = await importExpensesFromBuffer(request.file.buffer, {
        filename: request.file.originalname,
        createdById: request.user?.userId,
        source: "EXCEL",
      });

      await createAuditLog({
        entityType: "expense_import",
        entityId: batch.id,
        action: "expenses.imported",
        actorId: request.user?.userId,
        actorEmail: request.user?.email,
        metadata: {
          filename: request.file.originalname,
          succeeded: batch.succeeded,
          failed: batch.failed,
        },
      });

      emitFinanceEvent("expense.updated", {
        type: "imported",
        batchId: batch.id,
      });

      response.status(201).json({
        batch,
      });
    } catch (error) {
      next(error);
    }
  },
);
