import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";

export function readWorkbookFromBuffer(buffer: Buffer) {
  return XLSX.read(buffer, {
    cellDates: false,
    type: "buffer",
  });
}

export function readWorkbookFromFile(path: string) {
  const buffer = readFileSync(path);
  return XLSX.read(buffer, {
    cellDates: false,
    type: "buffer",
  });
}

function isFilledCell(value: unknown) {
  return String(value ?? "").trim() !== "";
}

function scoreHeaderRow(row: unknown[]) {
  return row.reduce<number>((score, cell) => {
    const text = String(cell ?? "").trim();
    if (!text) {
      return score;
    }

    if (/[A-Za-z]/.test(text)) {
      return score + 5;
    }

    if (typeof cell === "number") {
      return score - 2;
    }

    return score + 1;
  }, 0);
}

function findHeaderRowIndex(rows: unknown[][]) {
  const searchWindow = rows.slice(0, 10);

  let bestIndex = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [index, row] of searchWindow.entries()) {
    const filledCells = row.filter(isFilledCell).length;
    if (filledCells === 0) {
      continue;
    }

    const score: number = scoreHeaderRow(row);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  }

  return bestIndex;
}

function buildHeaders(row: unknown[]) {
  const duplicates = new Map<string, number>();

  return row.map((cell) => {
    const baseHeader = String(cell ?? "");
    const header = baseHeader.trim() === "" ? "__EMPTY" : baseHeader;
    const count = duplicates.get(header) ?? 0;
    duplicates.set(header, count + 1);
    return count === 0 ? header : `${header}_${count}`;
  });
}

function isRepeatedHeaderRow(row: unknown[], headers: string[]) {
  let comparableCells = 0;
  let matchingCells = 0;

  for (const [index, header] of headers.entries()) {
    const headerText = String(header ?? "").trim();
    const cellText = String(row[index] ?? "").trim();

    if (!headerText || headerText.startsWith("__EMPTY") || !cellText) {
      continue;
    }

    comparableCells += 1;
    if (cellText.toLowerCase() === headerText.toLowerCase()) {
      matchingCells += 1;
    }
  }

  return comparableCells >= 3 && matchingCells >= Math.ceil(comparableCells * 0.6);
}

export function sheetToRows(workbook: XLSX.WorkBook, sheetName: string) {
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error(`Missing worksheet "${sheetName}"`);
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!rows.length) {
    return [];
  }

  const headerRowIndex = findHeaderRowIndex(rows);
  const headers = buildHeaders(rows[headerRowIndex] ?? []);

  return rows
    .slice(headerRowIndex + 1)
    .filter((row) => row.some(isFilledCell))
    .filter((row) => !isRepeatedHeaderRow(row, headers))
    .map((row) =>
      headers.reduce<Record<string, unknown>>((record, header, index) => {
        record[header] = row[index] ?? "";
        return record;
      }, {}),
    );
}
