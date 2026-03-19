import express from "express";
import cors from "cors";
import helmet from "helmet";

import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { approvalsRouter } from "./modules/approvals/approvals.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { expensesRouter } from "./modules/expenses/expenses.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { paymentsRouter } from "./modules/payments/payments.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { zohoRouter } from "./modules/zoho/zoho.routes.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
      credentials: false,
    }),
  );
  app.use(helmet());
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_request, response) => {
    response.json({
      name: "AltF Finance OS API",
      version: "1.0.0",
    });
  });

  app.use("/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/expenses", expensesRouter);
  app.use("/api/approvals", approvalsRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/zoho", zohoRouter);

  app.use(errorHandler);

  return app;
}
