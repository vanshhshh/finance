import type { NextFunction, Request, Response } from "express";

import { logger } from "../lib/logger.js";

export function errorHandler(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  logger.error(error.message, error);

  return response.status(500).json({
    message: "Internal server error",
    detail: process.env.NODE_ENV === "development" ? error.message : undefined,
  });
}

