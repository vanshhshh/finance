import dayjs from "dayjs";

export function excelSerialToDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    const excelEpoch = dayjs("1899-12-30");
    return excelEpoch.add(value, "day").toDate();
  }

  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed.toDate() : null;
}

export function calculateOverdueDays(
  dueDate: Date | null | undefined,
  outstandingAmount: number,
) {
  if (!dueDate || outstandingAmount <= 0) {
    return 0;
  }

  const diff = dayjs().startOf("day").diff(dayjs(dueDate).startOf("day"), "day");
  return Math.max(diff, 0);
}

export function calculateAgingDays(
  referenceDate: Date | null | undefined,
  balanceAmount: number,
) {
  if (!referenceDate || balanceAmount <= 0) {
    return 0;
  }

  return Math.max(
    dayjs().startOf("day").diff(dayjs(referenceDate).startOf("day"), "day"),
    0,
  );
}

export function toISOStringOrNull(date: Date | null | undefined) {
  return date ? date.toISOString() : null;
}

