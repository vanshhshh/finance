import nodemailer from "nodemailer";
import { Resend } from "resend";

import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";

type EmailInput = {
  to: string[];
  subject: string;
  html: string;
};

async function sendWithResend(input: EmailInput) {
  if (!env.RESEND_API_KEY) {
    return false;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  return true;
}

async function sendWithSmtp(input: EmailInput) {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.EMAIL_FROM,
    to: input.to.join(","),
    subject: input.subject,
    html: input.html,
  });

  return true;
}

export async function sendEmail(input: EmailInput) {
  if (!input.to.length) {
    return;
  }

  try {
    const sent =
      (await sendWithResend(input)) || (await sendWithSmtp(input)) || false;

    if (!sent) {
      logger.warn("Email provider not configured; skipping email", {
        to: input.to,
        subject: input.subject,
      });
    }
  } catch (error) {
    logger.error("Failed to send email", error);
  }
}

export async function notifyExpenseCreated(expense: {
  expenseCode: string;
  vendor: string;
  branch: string;
  amount: string;
}) {
  const recipients = await prisma.user.findMany({
    where: {
      role: "APPROVER1",
      isActive: true,
    },
    select: {
      email: true,
    },
  });

  await sendEmail({
    to: recipients.map((recipient) => recipient.email),
    subject: `New expense submitted: ${expense.expenseCode}`,
    html: `<p>A new expense has been created for approval.</p>
      <p><strong>Expense:</strong> ${expense.expenseCode}</p>
      <p><strong>Vendor:</strong> ${expense.vendor}</p>
      <p><strong>Branch:</strong> ${expense.branch}</p>
      <p><strong>Amount:</strong> INR ${expense.amount}</p>`,
  });
}

export async function notifyNextApprover(input: {
  expenseCode: string;
  level: number;
  vendor: string;
  amount: string;
}) {
  const role = (`APPROVER${input.level}` as
    | "APPROVER1"
    | "APPROVER2"
    | "APPROVER3"
    | "APPROVER4");

  const recipients = await prisma.user.findMany({
    where: {
      role,
      isActive: true,
    },
    select: {
      email: true,
    },
  });

  await sendEmail({
    to: recipients.map((recipient) => recipient.email),
    subject: `Approval required: ${input.expenseCode}`,
    html: `<p>${input.expenseCode} is ready for approval level ${input.level}.</p>
      <p><strong>Vendor:</strong> ${input.vendor}</p>
      <p><strong>Amount:</strong> INR ${input.amount}</p>`,
  });
}

export async function sendPendingReminderEmails() {
  const staleExpenses = await prisma.expense.findMany({
    where: {
      status: "PENDING",
      agingDays: {
        gte: 30,
      },
    },
    include: {
      approvals: {
        where: {
          status: "PENDING",
        },
        orderBy: {
          level: "asc",
        },
        take: 1,
      },
    },
  });

  for (const expense of staleExpenses) {
    const currentStep = expense.approvals[0];
    if (!currentStep) {
      continue;
    }

    const recipients = await prisma.user.findMany({
      where: {
        role: currentStep.approverRole,
        isActive: true,
      },
      select: {
        email: true,
      },
    });

    await sendEmail({
      to: recipients.map((recipient) => recipient.email),
      subject: `Reminder: ${expense.expenseCode} pending for ${expense.agingDays} days`,
      html: `<p>${expense.expenseCode} has been waiting for approval for ${expense.agingDays} days.</p>
        <p><strong>Vendor:</strong> ${expense.vendor}</p>
        <p><strong>Branch:</strong> ${expense.branch}</p>`,
    });
  }
}

