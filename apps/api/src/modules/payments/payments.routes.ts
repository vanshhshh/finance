import { Router } from "express";

import { paymentFiltersSchema } from "@finance-platform/shared";

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../../middleware/auth.js";
import { validateQuery } from "../../middleware/validate.js";
import { createAuditLog } from "../audit/audit.service.js";
import { toCsv } from "../common/csv.js";
import { emitFinanceEvent } from "../common/socket.js";
import { upload } from "../uploads/upload.js";
import {
  exportPayments,
  getPaymentSummary,
  importPaymentsFromBuffer,
  listPayments,
} from "./payments.service.js";

export const paymentsRouter = Router();

paymentsRouter.use(requireAuth, requireRole(["ADMIN", "FINANCE"]));

paymentsRouter.get(
  "/",
  validateQuery(paymentFiltersSchema),
  async (request, response, next) => {
    try {
      const result = await listPayments(request.query as typeof request.query & {
        page: number;
        pageSize: number;
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

paymentsRouter.get(
  "/summary",
  validateQuery(paymentFiltersSchema),
  async (request, response, next) => {
    try {
      const result = await getPaymentSummary(request.query as typeof request.query & {
        page: number;
        pageSize: number;
      });
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

paymentsRouter.get(
  "/export",
  validateQuery(paymentFiltersSchema),
  async (request, response, next) => {
    try {
      const rows = await exportPayments(request.query as typeof request.query & {
        page: number;
        pageSize: number;
      });
      response.setHeader("Content-Type", "text/csv");
      response.setHeader("Content-Disposition", "attachment; filename=payments.csv");
      response.send(toCsv(rows));
    } catch (error) {
      next(error);
    }
  },
);

paymentsRouter.post(
  "/import",
  upload.single("file"),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      if (!request.file) {
        return response.status(400).json({ message: "Excel file is required" });
      }

      const batch = await importPaymentsFromBuffer(request.file.buffer, {
        source: "EXCEL",
        filename: request.file.originalname,
        createdById: request.user?.userId,
      });

      await createAuditLog({
        entityType: "payment_import",
        entityId: batch.id,
        action: "payments.imported",
        actorId: request.user?.userId,
        actorEmail: request.user?.email,
        metadata: {
          filename: request.file.originalname,
          succeeded: batch.succeeded,
          failed: batch.failed,
        },
      });

      emitFinanceEvent("payment.updated", {
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

