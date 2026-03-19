# AltF Finance OS

Internal finance platform that replaces the Excel-based AR dashboard and expense approval sheet with a production-ready web application.

## Stack

- Frontend: Next.js App Router, TypeScript, Tailwind, React Query, Recharts
- Backend: Express, TypeScript, Prisma, PostgreSQL, Socket.io
- Auth: Firebase Auth with backend session token exchange
- Email: Resend or SMTP via Nodemailer
- Integrations: Zoho webhook endpoint plus hourly polling fallback

## Workspace

- `apps/api`: Express API, Prisma schema, seed data, import/sync services
- `apps/web`: Next.js dashboard and admin UI
- `packages/shared`: shared enums and Zod schemas

## Quick Start

1. Copy [.env.example](/c:/Users/VANSH/Desktop/pradeep/.env.example) into `.env`.
2. Start PostgreSQL with `docker compose up -d postgres` or point `DATABASE_URL` at an existing instance.
3. Generate Prisma client and run the migration:

```bash
npm run prisma:generate
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
```

4. Seed sample users, payments, and expenses:

```bash
npm run seed
```

5. Start both apps:

```bash
npm run dev
```

Frontend runs on `http://localhost:3000` and API runs on `http://localhost:4000`.

## Useful Commands

```bash
npm run lint
npm run build
npm --workspace @finance-platform/api run import:workbooks
```

`import:workbooks` reads `PAYMENT_WORKBOOK_PATH` and `EXPENSE_WORKBOOK_PATH` from env, so you can import the source Excel files directly.

## Auth Notes

- Production flow: Google sign-in through Firebase on the frontend, then `/api/auth/firebase` exchanges the Firebase ID token for the app session token.
- Local fallback: when Firebase Admin is not configured and `DEV_AUTH_BYPASS=true`, the sign-in page accepts a developer email and creates a local session.

## Key Routes

- Payments UI: `/dashboard/payments`
- Expenses UI: `/dashboard/expenses`
- Approvals UI: `/dashboard/approvals`
- User admin: `/admin/users`
- Zoho webhook: `POST /api/zoho/webhook`

## Data Bootstrap

- Sample seed data lives in [seed.ts](/c:/Users/VANSH/Desktop/pradeep/apps/api/prisma/seed.ts).
- Prisma schema lives in [schema.prisma](/c:/Users/VANSH/Desktop/pradeep/apps/api/prisma/schema.prisma).
- Initial SQL migration lives in [migration.sql](/c:/Users/VANSH/Desktop/pradeep/apps/api/prisma/migrations/202603190001_init/migration.sql).

## Notes

- The web runner clears leaked private Next.js environment variables before `dev`, `build`, and `start` so this app is isolated from other Next projects on the same machine.
- Excel importers are mapped to the real workbook tabs used today: `Invoice Details`, `Customer Balance as per invoice`, `AR Future & OS`, and `expense master sheet`.

