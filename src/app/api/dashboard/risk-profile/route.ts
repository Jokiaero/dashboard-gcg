import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { listDeletedDocumentsByCategory, listDocumentsByCategory, syncCategoryFromFilesystem } from "@/lib/documentStore";
import { prisma } from "@/lib/prisma";

const RISK_CANDIDATE_CATEGORIES = ["pelaporan_risiko"];

type RiskExcelSource = {
  category: string;
  name: string;
  url: string;
  modifiedAt: string;
  size: number;
  type: string;
};

type RiskRow = {
  id: string;
  risk: string;
  level: "Low" | "Medium" | "High" | "Extreme";
  impact: number;
  likelihood: number;
  owner: string;
  trend: string;
};

type RiskExcelTable = {
  tableHeaders: string[];
  tableHeaderGroups: string[];
  tableRows: string[][];
};

type ExtractedRiskExcelTable = RiskExcelTable & {
  resolvedHeaders: string[];
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function clampMatrixValue(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.round(value)));
}

function normalizeRiskLevel(rawLevel: unknown): "Low" | "Medium" | "High" | "Extreme" {
  const text = String(rawLevel || "").trim().toLowerCase();
  if (/extreme|ekstrem/.test(text)) return "Extreme";
  if (/high|tinggi/.test(text)) return "High";
  if (/low|rendah/.test(text)) return "Low";
  return "Medium";
}

function inferImpactLikelihood(level: "Low" | "Medium" | "High" | "Extreme") {
  if (level === "Extreme") return { impact: 5, likelihood: 5 };
  if (level === "High") return { impact: 4, likelihood: 4 };
  if (level === "Low") return { impact: 2, likelihood: 2 };
  return { impact: 3, likelihood: 3 };
}

function normalizeTrend(rawTrend: unknown): string {
  const text = String(rawTrend || "").trim().toLowerCase();
  if (!text) return "same";

  if (/down|turun|closed|close|selesai/.test(text)) return "down";
  if (/up|naik|open|tinggi|urgent/.test(text)) return "up";
  return "same";
}

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

function fillForward(values: string[]): string[] {
  let current = "";
  return values.map((value) => {
    const cleaned = normalizeTableCell(value);
    if (cleaned) {
      current = cleaned;
      return cleaned;
    }
    return current;
  });
}

function scoreHeaderCandidateRow(cells: string[]): number {
  const nonEmpty = cells.filter((cell) => normalizeTableCell(cell) !== "");
  if (nonEmpty.length === 0) return -1;

  const joined = nonEmpty.join(" ").toLowerCase();
  const keywordHints = [
    "peristiwa",
    "risk",
    "risiko",
    "pemilik",
    "owner",
    "level",
    "likelihood",
    "impact",
    "kemungkinan",
    "dampak",
    "r/m/t/e",
    "no",
  ];

  const hintScore = keywordHints.reduce((acc, keyword) => (joined.includes(keyword) ? acc + 3 : acc), 0);
  return nonEmpty.length + hintScore;
}

function looksLikeGroupedRiskHeaderRow(cells: string[]): boolean {
  const joined = cells
    .map((cell) => normalizeTableCell(cell).toLowerCase())
    .filter((cell) => cell !== "")
    .join(" ");

  return joined.includes("risiko inherent") || joined.includes("risiko residual");
}

function looksLikeRiskSubHeaderRow(cells: string[]): boolean {
  const normalizedCells = cells
    .map((cell) => normalizeTableCell(cell).toLowerCase())
    .filter((cell) => cell !== "");

  if (normalizedCells.length === 0) return false;

  const tokens = new Set(normalizedCells);
  const hasK = tokens.has("k");
  const hasD = tokens.has("d");
  const hasLevel = normalizedCells.some((cell) => cell.includes("level"));
  const hasRmte = normalizedCells.some((cell) => /r\s*\/\s*m\s*\/\s*t\s*\/\s*e/.test(cell));

  return hasK && hasD && hasLevel && hasRmte;
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

  const currentRow = sheetRows[bestIndex] || [];
  const nextRow = bestIndex + 1 < sheetRows.length ? sheetRows[bestIndex + 1] || [] : [];

  // If current row is a merged group header and next row looks like subheaders,
  // treat next row as the actual header row so table structure matches Excel.
  if (looksLikeGroupedRiskHeaderRow(currentRow) && looksLikeRiskSubHeaderRow(nextRow)) {
    return bestIndex + 1;
  }

  return bestIndex;
}

function extractExcelTableFromSheet(sheet: XLSX.WorkSheet): ExtractedRiskExcelTable {
  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (sheetRows.length === 0) {
    return { tableHeaders: [], tableHeaderGroups: [], tableRows: [], resolvedHeaders: [] };
  }

  const matrixRows = sheetRows.map((row) => (row || []).map((cell) => normalizeTableCell(cell)));
  const headerIndex = pickHeaderRowIndex(matrixRows);
  const primaryHeaderRaw = headerIndex > 0 ? matrixRows[headerIndex - 1] || [] : [];
  const secondaryHeaderRaw = matrixRows[headerIndex] || [];

  const primaryNonEmpty = primaryHeaderRaw.filter((cell) => cell !== "").length;
  const secondaryNonEmpty = secondaryHeaderRaw.filter((cell) => cell !== "").length;
  const maxHeaderColumns = Math.max(primaryHeaderRaw.length, secondaryHeaderRaw.length, 0);

  const hasDistinctHeaderPair = Array.from({ length: maxHeaderColumns }, (_, index) => {
    const top = normalizeTableCell(primaryHeaderRaw[index]);
    const sub = normalizeTableCell(secondaryHeaderRaw[index]);
    return Boolean(top && sub && top.toLowerCase() !== sub.toLowerCase());
  }).some(Boolean);

  const groupedPatternDetected =
    looksLikeGroupedRiskHeaderRow(primaryHeaderRaw) && looksLikeRiskSubHeaderRow(secondaryHeaderRaw);

  const hasGroupedHeader =
    headerIndex > 0 &&
    primaryNonEmpty >= 2 &&
    secondaryNonEmpty >= 2 &&
    (hasDistinctHeaderPair || groupedPatternDetected);

  const rawDataRows = matrixRows
    .slice(headerIndex + 1)
    .filter((row) => (row || []).some((cell) => normalizeTableCell(cell) !== ""));

  const maxColumns = Math.max(
    primaryHeaderRaw.length,
    secondaryHeaderRaw.length,
    ...rawDataRows.map((row) => (row || []).length),
    0
  );

  const baseGroups = hasGroupedHeader
    ? fillForward(Array.from({ length: maxColumns }, (_, index) => normalizeTableCell(primaryHeaderRaw[index])))
    : Array.from({ length: maxColumns }, (_, index) => normalizeTableCell(secondaryHeaderRaw[index]));

  const tableHeaders = Array.from({ length: maxColumns }, (_, index) => {
    const subHeader = normalizeTableCell(secondaryHeaderRaw[index]);
    const groupHeader = normalizeTableCell(baseGroups[index]);
    if (hasGroupedHeader) {
      return subHeader || groupHeader || `Kolom ${index + 1}`;
    }
    return groupHeader || `Kolom ${index + 1}`;
  });

  const tableHeaderGroups = Array.from({ length: maxColumns }, (_, index) => {
    const groupHeader = normalizeTableCell(baseGroups[index]);
    return groupHeader || tableHeaders[index] || `Kolom ${index + 1}`;
  });

  const resolvedHeaders = Array.from({ length: maxColumns }, (_, index) => {
    const group = normalizeTableCell(tableHeaderGroups[index]);
    const sub = normalizeTableCell(tableHeaders[index]);
    if (hasGroupedHeader && group && sub && group.toLowerCase() !== sub.toLowerCase()) {
      return `${group} ${sub}`;
    }
    return sub || group || `Kolom ${index + 1}`;
  });

  const tableRows = rawDataRows.map((row) =>
    Array.from({ length: maxColumns }, (_, colIndex) => normalizeTableCell((row || [])[colIndex]))
  );

  return { tableHeaders, tableHeaderGroups, tableRows, resolvedHeaders };
}

function extractExcelTableFromWorkbookBuffer(buffer: Buffer): ExtractedRiskExcelTable {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return { tableHeaders: [], tableHeaderGroups: [], tableRows: [], resolvedHeaders: [] };
  }

  return extractExcelTableFromSheet(workbook.Sheets[firstSheet]);
}

async function listRiskExcelSources(): Promise<RiskExcelSource[]> {
  const sources: RiskExcelSource[] = [];

  for (const category of RISK_CANDIDATE_CATEGORIES) {
    await syncCategoryFromFilesystem(category);
    const docs = await listDocumentsByCategory(category);
    const recycledDocs = await listDeletedDocumentsByCategory(category);
    const recycledNameSet = new Set(
      recycledDocs
        .filter((doc) => isExcelFileName(doc.name))
        .map((doc) => String(doc.name || "").toLowerCase())
    );

    docs
      .filter((doc) => isExcelFileName(doc.name))
      .filter((doc) => !recycledNameSet.has(String(doc.name || "").toLowerCase()))
      .forEach((doc) => {
        sources.push({
          category,
          name: doc.name,
          url: doc.url,
          modifiedAt: doc.modifiedAt,
          size: doc.size,
          type: doc.type,
        });
      });
  }

  return sources.sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
}

function findHeaderIndexByKeys(headers: string[], keys: string[]): number {
  const normalizedHeaders = headers.map((header) => normalizeHeaderKey(header));
  for (const key of keys) {
    const match = normalizedHeaders.findIndex((header) => header.includes(key));
    if (match >= 0) return match;
  }
  return -1;
}

function isMetaRiskText(value: string): boolean {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return true;

  if (
    [
      "peristiwa risiko",
      "risk event",
      "risiko inherent",
      "risiko residual",
      "pemilik risiko",
      "no",
      "nomor",
      "k",
      "d",
      "level",
      "r/m/t/e",
      "menu",
    ].includes(normalized)
  ) {
    return true;
  }

  return /^(menu|nomor|no)\b/.test(normalized);
}

function parseRiskRowsFromExtractedTable(extracted: ExtractedRiskExcelTable): RiskRow[] {
  const headers = extracted.resolvedHeaders;
  const rows = extracted.tableRows;

  if (headers.length === 0 || rows.length === 0) {
    return [];
  }

  const fallbackRiskIndex = headers.length > 1 ? 1 : -1;
  const fallbackIdIndex = headers.length > 0 ? 0 : -1;
  const fallbackResidualLikelihoodIndex = headers.length > 6 ? 6 : -1;
  const fallbackResidualImpactIndex = headers.length > 7 ? 7 : -1;
  const fallbackResidualLevelIndex = headers.length > 8 ? 8 : -1;
  const fallbackOwnerIndex = headers.length > 10 ? 10 : -1;

  const riskIndex = (() => {
    const explicit = findHeaderIndexByKeys(headers, ["peristiwarisiko", "riskevent", "deskripsirisiko", "risk"]);
    return explicit >= 0 ? explicit : fallbackRiskIndex;
  })();

  const idIndex = (() => {
    const explicit = findHeaderIndexByKeys(headers, ["no", "idrisiko", "koderisiko", "id"]);
    return explicit >= 0 ? explicit : fallbackIdIndex;
  })();

  const levelIndex = (() => {
    const explicit = findHeaderIndexByKeys(headers, ["risikoresiduallevel", "tingkatrisikoakhir", "risklevel", "level"]);
    return explicit >= 0 ? explicit : fallbackResidualLevelIndex;
  })();

  const likelihoodIndex = (() => {
    const explicit = findHeaderIndexByKeys(headers, ["risikoresidualk", "residualk", "likelihood", "kemungkinan", "probabilitas", "skorkemungkinan"]);
    return explicit >= 0 ? explicit : fallbackResidualLikelihoodIndex;
  })();

  const impactIndex = (() => {
    const explicit = findHeaderIndexByKeys(headers, ["risikoresiduald", "residuald", "impact", "dampak", "skordampak"]);
    return explicit >= 0 ? explicit : fallbackResidualImpactIndex;
  })();

  const ownerIndex = (() => {
    const explicit = findHeaderIndexByKeys(headers, ["pemilikrisiko", "owner", "unitkerja", "department", "divisi"]);
    return explicit >= 0 ? explicit : fallbackOwnerIndex;
  })();

  const trendIndex = findHeaderIndexByKeys(headers, ["trend", "status"]);

  return rows
    .map((row, index) => {
      const fallbackId = `RISK-${index + 1}`;
      const risk = normalizeTableCell(riskIndex >= 0 ? row[riskIndex] : "");

      if (!risk || isMetaRiskText(risk)) return null;

      const rawId = normalizeTableCell(idIndex >= 0 ? row[idIndex] : "");
      const id = rawId || fallbackId;

      const rawLevel = normalizeTableCell(levelIndex >= 0 ? row[levelIndex] : "");
      const level = normalizeRiskLevel(rawLevel);

      const rawImpact = toFiniteNumber(impactIndex >= 0 ? row[impactIndex] : null);
      const rawLikelihood = toFiniteNumber(likelihoodIndex >= 0 ? row[likelihoodIndex] : null);

      const inferred = inferImpactLikelihood(level);
      const impact = clampMatrixValue(rawImpact ?? inferred.impact);
      const likelihood = clampMatrixValue(rawLikelihood ?? inferred.likelihood);

      const owner = normalizeTableCell(ownerIndex >= 0 ? row[ownerIndex] : "") || "Unknown";
      const trend = normalizeTrend(trendIndex >= 0 ? row[trendIndex] : "");

      return {
        id,
        risk,
        level,
        impact,
        likelihood,
        owner,
        trend,
      } satisfies RiskRow;
    })
    .filter((item): item is RiskRow => item !== null);
}

async function readRiskFromExcel(selectedSource?: { category: string; name: string }) {
  if (selectedSource) {
    const selectedPath = path.join(process.cwd(), "public", "assets", selectedSource.category, selectedSource.name);
    await access(selectedPath);
    const selectedBuffer = await readFile(selectedPath);
    const parsedTable = extractExcelTableFromWorkbookBuffer(selectedBuffer);
    const parsedRows = parseRiskRowsFromExtractedTable(parsedTable);

    return {
      data: parsedRows,
      tableHeaders: parsedTable.tableHeaders,
      tableHeaderGroups: parsedTable.tableHeaderGroups,
      tableRows: parsedTable.tableRows,
    };
  }

  return {
    data: [],
    tableHeaders: [],
    tableHeaderGroups: [],
    tableRows: [],
  };
}

async function getPreferredRiskSourceName(): Promise<string> {
  try {
    const row = await prisma.dashboardSettings.findUnique({
      where: { id: 1 },
      select: { gcgScoresJson: true },
    });

    const parsed = JSON.parse(String(row?.gcgScoresJson || ""));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return String((parsed as { riskProfileSourceName?: unknown }).riskProfileSourceName ?? "").trim();
    }
  } catch {
    // Keep resilient fallback behavior.
  }

  return "";
}

export async function GET(request: Request) {
  let availableSources: RiskExcelSource[] = [];
  try {
    availableSources = await listRiskExcelSources();
  } catch (sourceError) {
    console.warn("Failed to list risk excel sources:", sourceError);
  }

  const requestUrl = new URL(request.url);
  const requestedSourceName = requestUrl.searchParams.get("sourceName")?.trim() || "";
  const requestedSource = requestedSourceName
    ? availableSources.find((source) => source.name === requestedSourceName) ?? null
    : null;

  const preferredSourceName = await getPreferredRiskSourceName();
  const preferredSource = preferredSourceName
    ? availableSources.find((source) => source.name === preferredSourceName)
    : null;

  const sourceFile = requestedSource ?? preferredSource ?? availableSources[0] ?? null;

  if (!sourceFile) {
    return NextResponse.json({
      data: [],
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      source: "none",
      sourceFile: null,
      availableSources,
    });
  }

  try {
    const excelData = await readRiskFromExcel(
      sourceFile
        ? {
            category: sourceFile.category,
            name: sourceFile.name,
          }
        : undefined
    );

    if (excelData.data.length > 0 || excelData.tableRows.length > 0) {
      return NextResponse.json({
        data: excelData.data,
        tableHeaders: excelData.tableHeaders,
        tableHeaderGroups: excelData.tableHeaderGroups,
        tableRows: excelData.tableRows,
        source: "excel",
        sourceFile,
        availableSources,
      });
    }

    return NextResponse.json({
      data: [],
      tableHeaders: excelData.tableHeaders,
      tableHeaderGroups: excelData.tableHeaderGroups,
      tableRows: excelData.tableRows,
      source: "none",
      sourceFile,
      availableSources,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to read risk profile excel source:", errorMessage);
    return NextResponse.json({
      data: [],
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      source: "none",
      sourceFile,
      availableSources,
      error: "Gagal membaca file sumber",
    });
  }
}
