import jwt from "jsonwebtoken";

import type { UserRole } from "@finance-platform/shared";

import { env } from "../config/env.js";

export type AppSession = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  branch?: string | null;
};

export function signSessionToken(payload: AppSession) {
  return jwt.sign(payload, env.APP_JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: "12h",
  });
}

export function verifySessionToken(token: string) {
  return jwt.verify(token, env.APP_JWT_SECRET) as AppSession;
}

