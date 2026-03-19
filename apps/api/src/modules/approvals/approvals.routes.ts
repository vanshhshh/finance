import { Router } from "express";

import { expenseApprovalActionSchema } from "@finance-platform/shared";

import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import {
  getApprovalDashboard,
  processApprovalAction,
} from "../expenses/expenses.service.js";

export const approvalsRouter = Router();

approvalsRouter.use(requireAuth);

approvalsRouter.get("/dashboard", async (request: AuthenticatedRequest, response, next) => {
  try {
    if (!request.user) {
      return response.status(401).json({ message: "Authentication required" });
    }

    const dashboard = await getApprovalDashboard(
      request.user.role,
      request.user.userId,
    );
    response.json(dashboard);
  } catch (error) {
    next(error);
  }
});

approvalsRouter.post(
  "/:expenseId/:level",
  validateBody(expenseApprovalActionSchema),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      if (!request.user) {
        return response.status(401).json({ message: "Authentication required" });
      }

      const expense = await processApprovalAction(
        String(request.params.expenseId),
        Number(String(request.params.level)),
        request.body,
        {
          userId: request.user.userId,
          email: request.user.email,
          role: request.user.role,
        },
      );

      response.json({
        expense,
      });
    } catch (error) {
      next(error);
    }
  },
);
