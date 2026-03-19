import dayjs from "dayjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.expenseSettlement.deleteMany();
  await prisma.expenseApproval.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.zohoSyncEvent.deleteMany();
  await prisma.user.deleteMany();

  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@altf.example",
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        name: "Finance Lead",
        email: "finance@altf.example",
        role: "FINANCE",
      },
    }),
    prisma.user.create({
      data: {
        name: "Approver One",
        email: "approver1@altf.example",
        role: "APPROVER1",
      },
    }),
    prisma.user.create({
      data: {
        name: "Approver Two",
        email: "approver2@altf.example",
        role: "APPROVER2",
      },
    }),
    prisma.user.create({
      data: {
        name: "Approver Three",
        email: "approver3@altf.example",
        role: "APPROVER3",
      },
    }),
    prisma.user.create({
      data: {
        name: "Approver Four",
        email: "approver4@altf.example",
        role: "APPROVER4",
      },
    }),
  ]);

  await prisma.payment.createMany({
    data: [
      {
        customerName: "Fiora Online Limited",
        customerCategory: "ACTIVE",
        customerStatus: "Active - Under Accounts",
        branch: "AltF Empire Square, Mg Road",
        invoiceId: "PAY-SEED-001",
        invoiceNumber: "ALTF-2026-001",
        invoiceDate: dayjs().subtract(75, "day").toDate(),
        dueDate: dayjs().subtract(45, "day").toDate(),
        amount: 12272,
        paidAmount: 0,
        outstandingAmount: 12272,
        status: "OVERDUE",
        disputed: false,
        futureDue: false,
        overdueDays: 45,
        source: "MANUAL",
      },
      {
        customerName: "Luminar Technology Services",
        customerCategory: "DISPUTED",
        customerStatus: "Active - Under Accounts",
        branch: "AltF Megacity",
        invoiceId: "PAY-SEED-002",
        invoiceNumber: "ALTF-2026-002",
        invoiceDate: dayjs().subtract(30, "day").toDate(),
        dueDate: dayjs().subtract(5, "day").toDate(),
        amount: 7582,
        paidAmount: 200,
        outstandingAmount: 7382,
        status: "DISPUTED",
        disputed: true,
        futureDue: false,
        overdueDays: 5,
        source: "MANUAL",
      },
      {
        customerName: "Paytm",
        customerCategory: "FORMER",
        customerStatus: "Inactive - Under Accounts",
        branch: "Corporate Office",
        invoiceId: "PAY-SEED-003",
        invoiceNumber: "ALTF-2026-003",
        invoiceDate: dayjs().subtract(15, "day").toDate(),
        dueDate: dayjs().add(15, "day").toDate(),
        amount: 84050,
        paidAmount: 83780,
        outstandingAmount: 270,
        status: "PARTIAL",
        disputed: false,
        futureDue: false,
        overdueDays: 0,
        source: "MANUAL",
      },
      {
        customerName: "Studds Accessories Limited",
        customerCategory: "FUTURE",
        customerStatus: "Active - Under Operations",
        branch: "AltF MPD",
        invoiceId: "PAY-SEED-004",
        invoiceNumber: "ALTF-2026-004",
        invoiceDate: dayjs().subtract(2, "day").toDate(),
        dueDate: dayjs().add(28, "day").toDate(),
        amount: 486750,
        paidAmount: 0,
        outstandingAmount: 486750,
        status: "FUTURE",
        disputed: false,
        futureDue: true,
        overdueDays: 0,
        source: "MANUAL",
      },
    ],
  });

  const expenseOne = await prisma.expense.create({
    data: {
      expenseCode: "EXP-2603-0001",
      externalCode: "SEED-EX-001",
      vendor: "Stellar Enterprises",
      vendorCode: "V1294",
      branch: "AltF Noida Sector 142",
      expenseHead: "Tea & Coffee (112)",
      costCategory: "UP",
      billNumber: "TEA-APR-001",
      invoiceDate: dayjs().subtract(35, "day").toDate(),
      dueDate: dayjs().subtract(5, "day").toDate(),
      amount: 87845,
      gstAmount: 5938.75,
      tdsAmount: 0,
      netAmount: 93783.75,
      paidAmount: 0,
      balanceAmount: 93783.75,
      status: "PENDING",
      approvalLevel: 2,
      description: "Tea and coffee stock refill for new bookings",
      agingDays: 35,
      source: "MANUAL",
      createdById: users[1].id,
      approvals: {
        create: [
          {
            level: 1,
            approverRole: "APPROVER1",
            approverId: users[2].id,
            status: "APPROVED",
            actedAt: dayjs().subtract(30, "day").toDate(),
          },
          {
            level: 2,
            approverRole: "APPROVER2",
            status: "PENDING",
          },
          {
            level: 3,
            approverRole: "APPROVER3",
            status: "PENDING",
          },
          {
            level: 4,
            approverRole: "APPROVER4",
            status: "PENDING",
          },
        ],
      },
    },
  });

  const expenseTwo = await prisma.expense.create({
    data: {
      expenseCode: "EXP-2603-0002",
      externalCode: "SEED-EX-002",
      vendor: "Impressions Services Private Limited",
      vendorCode: "V1717",
      branch: "AltF Mohan Cooperative",
      expenseHead: "Blue Collar Staff Salaries (105)",
      costCategory: "DL",
      billNumber: "SA-07-25-26-3083",
      invoiceDate: dayjs().subtract(62, "day").toDate(),
      dueDate: dayjs().subtract(12, "day").toDate(),
      amount: 159295.74,
      gstAmount: 25487.26,
      tdsAmount: 0,
      netAmount: 184783,
      paidAmount: 92391.5,
      balanceAmount: 92391.5,
      status: "PARTIAL",
      approvalLevel: 4,
      description: "Support staff payout for Mohan Cooperative",
      agingDays: 62,
      source: "MANUAL",
      createdById: users[1].id,
      approvedById: users[5].id,
      approvals: {
        create: [
          {
            level: 1,
            approverRole: "APPROVER1",
            approverId: users[2].id,
            status: "APPROVED",
            actedAt: dayjs().subtract(58, "day").toDate(),
          },
          {
            level: 2,
            approverRole: "APPROVER2",
            approverId: users[3].id,
            status: "APPROVED",
            actedAt: dayjs().subtract(55, "day").toDate(),
          },
          {
            level: 3,
            approverRole: "APPROVER3",
            approverId: users[4].id,
            status: "APPROVED",
            actedAt: dayjs().subtract(52, "day").toDate(),
          },
          {
            level: 4,
            approverRole: "APPROVER4",
            approverId: users[5].id,
            status: "APPROVED",
            actedAt: dayjs().subtract(48, "day").toDate(),
          },
        ],
      },
    },
  });

  const expenseThree = await prisma.expense.create({
    data: {
      expenseCode: "EXP-2603-0003",
      externalCode: "SEED-EX-003",
      vendor: "YI Facilities Management",
      vendorCode: "V1093",
      branch: "AltF Okhla 101",
      expenseHead: "Common Area Maintenance",
      costCategory: "DL",
      billNumber: "YIFM-023",
      invoiceDate: dayjs().subtract(18, "day").toDate(),
      dueDate: dayjs().add(7, "day").toDate(),
      amount: 827678,
      gstAmount: 148982.04,
      tdsAmount: 16553.56,
      netAmount: 960106.48,
      paidAmount: 0,
      balanceAmount: 960106.48,
      status: "REJECTED",
      approvalLevel: 3,
      description: "CAM charges for April operations block",
      agingDays: 18,
      source: "MANUAL",
      createdById: users[1].id,
      approvals: {
        create: [
          {
            level: 1,
            approverRole: "APPROVER1",
            approverId: users[2].id,
            status: "APPROVED",
            actedAt: dayjs().subtract(14, "day").toDate(),
          },
          {
            level: 2,
            approverRole: "APPROVER2",
            approverId: users[3].id,
            status: "APPROVED",
            actedAt: dayjs().subtract(12, "day").toDate(),
          },
          {
            level: 3,
            approverRole: "APPROVER3",
            approverId: users[4].id,
            status: "REJECTED",
            comments: "Budget cap exceeded for this month",
            actedAt: dayjs().subtract(9, "day").toDate(),
          },
          {
            level: 4,
            approverRole: "APPROVER4",
            status: "PENDING",
          },
        ],
      },
    },
  });

  await prisma.expenseSettlement.create({
    data: {
      expenseId: expenseTwo.id,
      amount: 92391.5,
      paidOn: dayjs().subtract(8, "day").toDate(),
      reference: "NEFT-2026-0001",
      notes: "First tranche released",
      createdById: users[1].id,
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        entityType: "expense",
        entityId: expenseOne.id,
        action: "expense.created",
        actorId: users[1].id,
        actorEmail: users[1].email,
        metadata: {
          source: "seed",
        },
      },
      {
        entityType: "expense",
        entityId: expenseThree.id,
        action: "expense.approval.reject",
        actorId: users[4].id,
        actorEmail: users[4].email,
        metadata: {
          source: "seed",
        },
      },
    ],
  });

  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

