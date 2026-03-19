import { Router } from "express";

import { webhookSchema } from "@finance-platform/shared";

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../../middleware/auth.js";
import { env } from "../../config/env.js";
import { validateBody } from "../../middleware/validate.js";
import { handleZohoWebhook, pollZohoChanges } from "./zoho.service.js";

export const zohoRouter = Router();

zohoRouter.post(
  "/webhook",
  validateBody(webhookSchema),
  async (request, response, next) => {
    try {
      const secret = request.headers["x-zoho-signature"];
      if (env.ZOHO_WEBHOOK_SECRET && secret !== env.ZOHO_WEBHOOK_SECRET) {
        return response.status(401).json({ message: "Invalid Zoho signature" });
      }

      const result = await handleZohoWebhook(request.body);
      response.status(202).json(result);
    } catch (error) {
      next(error);
    }
  },
);

zohoRouter.post(
  "/sync",
  requireAuth,
  requireRole(["ADMIN"]),
  async (_request: AuthenticatedRequest, response, next) => {
    try {
      const result = await pollZohoChanges();
      response.json(result);
    } catch (error) {
      next(error);
    }
  },
);

