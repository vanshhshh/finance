import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  API_URL: z.string().url().default("http://localhost:4000"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  APP_JWT_SECRET: z.string().min(16),
  USE_ZOHO: z.coerce.boolean().default(false),
  ZOHO_BASE_URL: z.string().url().default("https://www.zohoapis.in"),
  ZOHO_CLIENT_ID: z.string().optional(),
  ZOHO_CLIENT_SECRET: z.string().optional(),
  ZOHO_REFRESH_TOKEN: z.string().optional(),
  ZOHO_ORG_ID: z.string().optional(),
  ZOHO_WEBHOOK_SECRET: z.string().optional(),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default("finance@example.com"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  DEFAULT_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  DEFAULT_FINANCE_EMAIL: z.string().email().default("finance@example.com"),
  CRON_TIMEZONE: z.string().default("Asia/Kolkata"),
  PAYMENT_WORKBOOK_PATH: z.string().optional(),
  EXPENSE_WORKBOOK_PATH: z.string().optional(),
  DEV_AUTH_BYPASS: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === "production";

