import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  listDeletedDocumentsByCategory,
  listDocumentsByCategory,
  syncCategoryFromFilesystem,
} from "@/lib/documentStore";
import { prisma } from "@/lib/prisma";

type ApprovalChartItem = {
  tahun: string;
  nilai: number;
};

type ApprovalSourceOption = {
  category: "approval_kepatuhan";
  name: string;
  url: string;
  modifiedAt: string;
  size: number;
  type: string;
};

const APPROVAL_CATEGORY = "approval_kepatuhan";

const YEAR_HEADER_KEYS = ["tahun", "year", "periode", "thn"];
const APPROVAL_HEADER_KEYS = [
  "approval",
  "nilai",
  "value",
  "persen",
  "persentase",
  "approvalrate",
  "kepatuhan",
];

function isExcelFileName(fileName: string) {
  const lower = String(fileName || "").toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function normalizeTableCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeHeaderKey(value: string): string {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function extractYear(value: unknown): string {
  const text = normalizeTableCell(value);
  if (!text) return "";

  const matched = text.match(/(?:19|20)\d{2}/);
  if (matched?.[0]) {
    return matched[0];
  }

  const numeric = Number(text);
  if (Number.isInteger(numeric) && numeric >= 1900 && numeric <= 2999) {
    return String(numeric);
  }

  return "";
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const text = normalizeTableCell(value)
    .replace(/\u00a0/g, " ")
    .replace(/%/g, "")
    .replace(/\s+/g, "");
  if (!text) return null;

  const localeNormalized = (() => {
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(text)) {
      return text.replace(/\./g, "").replace(",", ".");
    }

    if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)) {
      return text.replace(/,/g, "");
    }

    return text.replace(",", ".");
  })();

  const parsed = Number(localeNormalized);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const fallbackMatch = localeNormalized.match(/-?\d+(?:\.\d+)?/);
  if (!fallbackMatch) {
    return null;
  }

  const fallbackParsed = Number(fallbackMatch[0]);
  return Number.isFinite(fallbackParsed) ? fallbackParsed : null;
}

function findHeaderIndexByKeys(headers: string[], keys: string[]): number {
  const normalizedHeaders = headers.map((header) => normalizeHeaderKey(header));
  for (const key of keys) {
    const matched = normalizedHeaders.findIndex((header) => header.includes(key));
    if (matched >= 0) return matched;
  }
  return -1;
}

function scoreHeaderCandidateRow(cells: string[]): number {
  const nonEmpty = cells.filter((cell) => normalizeTableCell(cell) !== "");
  if (nonEmpty.length === 0) return -1;

  const normalized = nonEmpty.map((cell) => normalizeHeaderKey(cell));
  const yearHints = normalized.some((cell) => YEAR_HEADER_KEYS.some((key) => cell.includes(key))) ? 5 : 0;
  const approvalHints = normalized.some((cell) => APPROVAL_HEADER_KEYS.some((key) => cell.includes(key))) ? 5 : 0;

  return nonEmpty.length + yearHints + approvalHints;
}

function looksLikeApprovalDataRow(cells: string[]): boolean {
  const yearExists = cells.some((cell) => extractYear(cell) !== "");
  const numericExists = cells.some((cell) => toFiniteNumber(cell) !== null);
  return yearExists && numericExists;
}

function pickHeaderRowIndex(sheetRows: string[][]): number {
  const scanLimit = Math.min(sheetRows.length, 15);
  let bestIndex = 0;
  let bestScore = -1;

  for (let i = 0; i < scanLimit; i += 1) {
    const score = scoreHeaderCandidateRow(sheetRows[i] || []);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestScore < 4 && looksLikeApprovalDataRow(sheetRows[0] || [])) {
    return -1;
  }

  return bestIndex;
}

function mergeRowsByYear(rows: ApprovalChartItem[]): ApprovalChartItem[] {
  const yearlyMap = new Map<string, ApprovalChartItem>();

  rows.forEach((row) => {
    const current = yearlyMap.get(row.tahun) || {
      tahun: row.tahun,
      nilai: 0,
    };

    current.nilai += Number(row.nilai || 0);
    yearlyMap.set(row.tahun, current);
  });

  return Array.from(yearlyMap.values()).sort((a, b) => a.tahun.localeCompare(b.tahun, "id"));
}

function parseApprovalRowsFromSheet(sheet: XLSX.WorkSheet): ApprovalChartItem[] {
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (sheetRows.length === 0) {
    return [];
  }

  const matrixRows = sheetRows.map((row) => (row || []).map((cell) => normalizeTableCell(cell)));
  const headerIndex = pickHeaderRowIndex(matrixRows);

  const headerRow = headerIndex >= 0 ? matrixRows[headerIndex] || [] : [];
  const yearIndex = findHeaderIndexByKeys(headerRow, YEAR_HEADER_KEYS);
  const approvalIndex = findHeaderIndexByKeys(headerRow, APPROVAL_HEADER_KEYS);

  const dataRows = matrixRows.slice(headerIndex + 1);

  const parsedRows = dataRows
    .map((row) => {
      const yearValue = yearIndex >= 0 ? row[yearIndex] : "";
      const tahun = extractYear(yearValue) || row.map((cell) => extractYear(cell)).find(Boolean) || "";
      if (!tahun) {
        return null;
      }

      const explicitValue = approvalIndex >= 0 ? toFiniteNumber(row[approvalIndex]) : null;

      const fallbackNumbers = row
        .map((cell) => ({
          value: toFiniteNumber(cell),
          isYear: extractYear(cell) !== "",
        }))
        .filter((item) => item.value !== null && !item.isYear)
        .map((item) => Number(item.value));

      let nilai = explicitValue ?? fallbackNumbers[0] ?? 0;

      // Normalize to 0-1 range if value is greater than 1 (assumes percentage in raw form like 85 = 85%)
      if (nilai > 1) {
        nilai = nilai / 100;
      }

      return {
        tahun,
        nilai,
      } satisfies ApprovalChartItem;
    })
    .filter((item): item is ApprovalChartItem => item !== null);

  return mergeRowsByYear(parsedRows);
}

async function listApprovalExcelSources(): Promise<ApprovalSourceOption[]> {
  await syncCategoryFromFilesystem(APPROVAL_CATEGORY);

  const docs = await listDocumentsByCategory(APPROVAL_CATEGORY);
  const recycledDocs = await listDeletedDocumentsByCategory(APPROVAL_CATEGORY);
  const recycledNameSet = new Set(
    recycledDocs
      .filter((doc) => isExcelFileName(doc.name))
      .map((doc) => String(doc.name || "").toLowerCase())
  );

  const sources = docs
    .filter((doc) => isExcelFileName(doc.name))
    .filter((doc) => !recycledNameSet.has(String(doc.name || "").toLowerCase()))
    .map((doc) => ({
      category: APPROVAL_CATEGORY,
      name: doc.name,
      url: doc.url,
      modifiedAt: doc.modifiedAt,
      size: doc.size,
      type: doc.type,
    }));

  return sources.sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
}

async function readApprovalFromExcelSource(source: ApprovalSourceOption): Promise<ApprovalChartItem[]> {
  const filePath = path.join(process.cwd(), "public", "assets", source.category, source.name);
  await access(filePath);

  const buffer = await readFile(filePath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });

  const parsedRows: ApprovalChartItem[] = [];
  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return;
    parsedRows.push(...parseApprovalRowsFromSheet(sheet));
  });

  return mergeRowsByYear(parsedRows);
}

async function readPreferredApprovalFromExcel(requestedSourceName: string): Promise<{
  data: ApprovalChartItem[];
  sourceFile: ApprovalSourceOption | null;
  availableSources: ApprovalSourceOption[];
}> {
  const availableSources = await listApprovalExcelSources();
  if (availableSources.length === 0) {
    return { data: [], sourceFile: null, availableSources };
  }

  if (requestedSourceName) {
    const selected = availableSources.find((source) => source.name === requestedSourceName) || null;
    if (!selected) {
      return { data: [], sourceFile: null, availableSources };
    }

    const parsed = await readApprovalFromExcelSource(selected);
    return { data: parsed, sourceFile: selected, availableSources };
  }

  let bestSource: ApprovalSourceOption | null = null;
  let bestRows: ApprovalChartItem[] = [];

  for (const source of availableSources) {
    const parsedRows = await readApprovalFromExcelSource(source);
    if (parsedRows.length > bestRows.length) {
      bestRows = parsedRows;
      bestSource = source;
    }
  }

  return { data: bestRows, sourceFile: bestSource, availableSources };
}

async function readApprovalFromDatabase(): Promise<ApprovalChartItem[]> {
  const rows = await prisma.dataLaporan.findMany({
    where: {
      OR: [{ department: "Approval Kepatuhan" }, { divisi: "Approval Kepatuhan" }],
      tahun: {
        not: null,
      },
    },
    orderBy: {
      tahun: "asc",
    },
    select: {
      tahun: true,
      status_approved: true,
    },
  });

  const mappedRows = rows
    .map((row) => {
      let nilai = Number(row.status_approved || 0);
      // Normalize to 0-1 range if value is greater than 1
      if (nilai > 1) {
        nilai = nilai / 100;
      }
      return {
        tahun: String(row.tahun || "").trim(),
        nilai,
      };
    })
    .filter((item) => item.tahun !== "");

  return mergeRowsByYear(mappedRows);
}

export async function GET(request: Request) {
  let availableSources: ApprovalSourceOption[] = [];
  let sourceFile: ApprovalSourceOption | null = null;

  try {
    const requestUrl = new URL(request.url);
    const requestedSourceName = requestUrl.searchParams.get("sourceName")?.trim() || "";

    const excelResult = await readPreferredApprovalFromExcel(requestedSourceName);
    availableSources = excelResult.availableSources;
    sourceFile = excelResult.sourceFile;

    if (excelResult.data.length > 0) {
      return NextResponse.json({
        data: excelResult.data,
        source: "excel",
        sourceFile,
        availableSources,
      });
    }

    const data = await readApprovalFromDatabase();
    return NextResponse.json({
      data,
      source: data.length > 0 ? "database" : "none",
      sourceFile,
      availableSources,
    });
  } catch (error: unknown) {
    console.warn("Approval Excel source unavailable, fallback to database", error);

    try {
      const data = await readApprovalFromDatabase();
      return NextResponse.json({
        data,
        source: data.length > 0 ? "database" : "none",
        sourceFile,
        availableSources,
      });
    } catch (dbError) {
      console.error("Failed to read approval kepatuhan from database:", dbError);
      return NextResponse.json(
        {
          data: [],
          source: "none",
          sourceFile: null,
          availableSources,
        },
        { status: 500 }
      );
    }
  }
}
