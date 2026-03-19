import { Router } from "express";

import { updateUserRoleSchema } from "@finance-platform/shared";

import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { prisma } from "../../lib/prisma.js";
import { createAuditLog } from "../audit/audit.service.js";

export const usersRouter = Router();

usersRouter.use(requireAuth, requireRole(["ADMIN"]));

usersRouter.get("/", async (_request, response, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    response.json({
      users,
    });
  } catch (error) {
    next(error);
  }
});

usersRouter.patch(
  "/:id",
  validateBody(updateUserRoleSchema),
  async (request: AuthenticatedRequest, response, next) => {
    try {
      const user = await prisma.user.update({
        where: {
          id: String(request.params.id),
        },
        data: {
          role: request.body.role,
          branch: request.body.branch,
        },
      });

      await createAuditLog({
        entityType: "user",
        entityId: user.id,
        action: "user.role.updated",
        actorId: request.user?.userId,
        actorEmail: request.user?.email,
        metadata: request.body,
      });

      response.json({
        user,
      });
    } catch (error) {
      next(error);
    }
  },
);
