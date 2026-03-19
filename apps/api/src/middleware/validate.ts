import type { NextFunction, Request, Response } from "express";

import type { ZodSchema } from "zod";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.body);

    if (!result.success) {
      return response.status(400).json({
        message: "Validation failed",
        issues: result.error.flatten(),
      });
    }

    request.body = result.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (request: Request, response: Response, next: NextFunction) => {
    const result = schema.safeParse(request.query);

    if (!result.success) {
      return response.status(400).json({
        message: "Validation failed",
        issues: result.error.flatten(),
      });
    }

    request.query = result.data as Request["query"];
    next();
  };
}

