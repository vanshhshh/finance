import type { NextFunction, Request, Response } from "express";

import type { UserRole } from "@finance-platform/shared";

import { verifySessionToken } from "../lib/jwt.js";

export type AuthenticatedRequest = Request & {
  user?: {
    userId: string;
    email: string;
    name: string;
    role: UserRole;
    branch?: string | null;
  };
};

export function requireAuth(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
  const header = request.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return response.status(401).json({ message: "Missing bearer token" });
  }

  const token = header.replace("Bearer ", "").trim();

  try {
    request.user = verifySessionToken(token);
    next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireRole(roles: UserRole[]) {
  return (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ) => {
    if (!request.user) {
      return response.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(request.user.role)) {
      return response.status(403).json({ message: "Access denied" });
    }

    next();
  };
}

