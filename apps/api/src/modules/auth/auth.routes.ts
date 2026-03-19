import { Router } from "express";

import { authFirebaseSchema } from "@finance-platform/shared";

import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth.js";
import { validateBody } from "../../middleware/validate.js";
import { authenticateWithFirebase } from "./auth.service.js";

export const authRouter = Router();

authRouter.post(
  "/firebase",
  validateBody(authFirebaseSchema),
  async (request, response, next) => {
    try {
      const session = await authenticateWithFirebase(request.body.idToken);
      response.json(session);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.get("/me", requireAuth, async (request: AuthenticatedRequest, response) => {
  response.json({
    user: request.user,
  });
});

