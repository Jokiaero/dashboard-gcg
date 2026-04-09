import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import {
  listDeletedDocumentsByCategory,
  listDocumentsByCategory,
  syncCategoryFromFilesystem,
} from "@/lib/documentStore";
import { sessionOptions, type SessionData } from "@/lib/session";
import { isAdminRole } from "@/lib/roles";

const ALLOWED_PELAPORAN_CATEGORIES = [
  "pelaporan_wbs",
  "pelaporan_risiko",
  "pelaporan_penyuapan",
  "pelaporan_ppg",
  "pelaporan_survey",
  "approval_kepatuhan",
] as const;

type AllowedPelaporanCategory = (typeof ALLOWED_PELAPORAN_CATEGORIES)[number];

type PelaporanExcelSource = {
  category: AllowedPelaporanCategory;
  name: string;
  url: string;
  modifiedAt: string;
  size: number;
  type: string;
};

type PelaporanSheetMerge = {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
};

type PelaporanExcelTable = {
  tableHeaders: string[];
  tableHeaderGroups: string[];
  tableRows: string[][];
  rawMatrix: string[][];
  rawMerges: PelaporanSheetMerge[];
  rawColWidths: number[];
  rawRowHeights: number[];
  rawHiddenCols: boolean[];
  rawHiddenRows: boolean[];
};

function isAllowedPelaporanCategory(value: string): value is AllowedPelaporanCategory {
  return ALLOWED_PELAPORAN_CATEGORIES.includes(value as AllowedPelaporanCategory);
}

function isExcelFileName(fileName: string) {
  const lower = String(fileName || "").toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function normalizeTableCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toRawDisplayCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => normalizeTableCell(item));
}

function normalizeRows(value: unknown, columnCount: number): string[][] {
  if (!Array.isArray(value)) return [];

  return value.map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return Array.from({ length: columnCount }, (_, index) => normalizeTableCell(cells[index]));
  });
}

function buildSheetRowsForPersist(headers: string[], headerGroups: string[], rows: string[][]): string[][] {
  const normalizedHeaders = headers.map((header, index) => header || `Kolom ${index + 1}`);
  const normalizedGroups = normalizedHeaders.map((header, index) => headerGroups[index] || header);
  const hasGroupedHeader = normalizedGroups.some(
    (group, index) => normalizeTableCell(group).toLowerCase() !== normalizeTableCell(normalizedHeaders[index]).toLowerCase()
  );

  return hasGroupedHeader
    ? [normalizedGroups, normalizedHeaders, ...rows]
    : [normalizedHeaders, ...rows];
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

  if (looksLikeGroupedRiskHeaderRow(currentRow) && looksLikeRiskSubHeaderRow(nextRow)) {
    return bestIndex + 1;
  }

  return bestIndex;
}

function extractRawSheetGrid(
  sheet: XLSX.WorkSheet,
  decodedRange: XLSX.Range | null
): {
  rawMatrix: string[][];
  rawMerges: PelaporanSheetMerge[];
  rawColWidths: number[];
  rawRowHeights: number[];
  rawHiddenCols: boolean[];
  rawHiddenRows: boolean[];
} {
  const rangeStartRow = decodedRange ? decodedRange.s.r : 0;
  const rangeStartCol = decodedRange ? decodedRange.s.c : 0;
  const merges = Array.isArray(sheet["!merges"]) ? sheet["!merges"] : [];

  const rowCount = decodedRange ? decodedRange.e.r - decodedRange.s.r + 1 : 0;
  const colCount = decodedRange ? decodedRange.e.c - decodedRange.s.c + 1 : 0;
  const maxRowIndex = rowCount - 1;
  const maxColIndex = colCount - 1;

  const rawMatrix = rowCount > 0 && colCount > 0
    ? Array.from({ length: rowCount }, (_, rowIndex) =>
        Array.from({ length: colCount }, (_, colIndex) => {
          const cellAddress = XLSX.utils.encode_cell({
            r: rangeStartRow + rowIndex,
            c: rangeStartCol + colIndex,
          });
          const cell = sheet[cellAddress] as XLSX.CellObject | undefined;
          return toRawDisplayCell(cell?.w ?? cell?.v ?? "");
        })
      )
    : [];

  const sheetCols = Array.isArray(sheet["!cols"]) ? sheet["!cols"] : [];
  const sheetRows = Array.isArray(sheet["!rows"]) ? sheet["!rows"] : [];
  const rawHiddenCols = rowCount > 0 && colCount > 0
    ? Array.from({ length: colCount }, (_, colIndex) => {
        const absoluteColIndex = rangeStartCol + colIndex;
        const sheetCol = sheetCols[absoluteColIndex] as { hidden?: boolean } | undefined;
        return Boolean(sheetCol?.hidden);
      })
    : [];

  const rawHiddenRows = rowCount > 0
    ? Array.from({ length: rowCount }, (_, rowIndex) => {
        const absoluteRowIndex = rangeStartRow + rowIndex;
        const sheetRow = sheetRows[absoluteRowIndex] as { hidden?: boolean } | undefined;
        return Boolean(sheetRow?.hidden);
      })
    : [];

  const rawColWidths = rowCount > 0 && colCount > 0
    ? Array.from({ length: colCount }, (_, colIndex) => {
        const absoluteColIndex = rangeStartCol + colIndex;
        const sheetCol = sheetCols[absoluteColIndex] as { wpx?: number; wch?: number } | undefined;

        const widthFromPixels = Number(sheetCol?.wpx || 0);
        const widthFromChars = Number(sheetCol?.wch || 0);

        const derivedWidth = widthFromPixels > 0
          ? Math.round(widthFromPixels)
          : widthFromChars > 0
            ? Math.round(widthFromChars * 8 + 16)
            : 120;

        return Math.max(48, Math.min(520, derivedWidth));
      })
    : [];

  const rawRowHeights = rowCount > 0
    ? Array.from({ length: rowCount }, (_, rowIndex) => {
        const absoluteRowIndex = rangeStartRow + rowIndex;
        const sheetRow = sheetRows[absoluteRowIndex] as { hpx?: number; hpt?: number } | undefined;
        const heightFromPixels = Number(sheetRow?.hpx || 0);
        const heightFromPoints = Number(sheetRow?.hpt || 0);
        const derivedHeight = heightFromPixels > 0
          ? Math.round(heightFromPixels)
          : heightFromPoints > 0
            ? Math.round(heightFromPoints * (4 / 3))
            : 0;

        return Math.max(0, Math.min(600, derivedHeight));
      })
    : [];

  const rawMerges = merges
    .map((merge) => ({
      startRow: merge.s.r - rangeStartRow,
      startCol: merge.s.c - rangeStartCol,
      endRow: merge.e.r - rangeStartRow,
      endCol: merge.e.c - rangeStartCol,
    }))
    .filter((merge) =>
      rowCount > 0 &&
      colCount > 0 &&
      merge.endRow >= 0 &&
      merge.endCol >= 0 &&
      merge.startRow <= maxRowIndex &&
      merge.startCol <= maxColIndex
    )
    .map((merge) => {
      const clampedStartRow = Math.max(0, Math.min(maxRowIndex, merge.startRow));
      const clampedStartCol = Math.max(0, Math.min(maxColIndex, merge.startCol));
      const clampedEndRow = Math.max(clampedStartRow, Math.min(maxRowIndex, merge.endRow));
      const clampedEndCol = Math.max(clampedStartCol, Math.min(maxColIndex, merge.endCol));

      return {
        startRow: clampedStartRow,
        startCol: clampedStartCol,
        endRow: clampedEndRow,
        endCol: clampedEndCol,
      };
    });

  return { rawMatrix, rawMerges, rawColWidths, rawRowHeights, rawHiddenCols, rawHiddenRows };
}

function extractExcelTableFromSheet(sheet: XLSX.WorkSheet): PelaporanExcelTable {
  const decodedRange = sheet["!ref"] ? XLSX.utils.decode_range(sheet["!ref"]) : null;

  const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    range: sheet["!ref"] || undefined,
  });

  if (sheetRows.length === 0) {
    return {
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      rawMatrix: [],
      rawMerges: [],
      rawColWidths: [],
      rawRowHeights: [],
      rawHiddenCols: [],
      rawHiddenRows: [],
    };
  }

  const matrixRows = sheetRows.map((row) => (row || []).map((cell) => normalizeTableCell(cell)));
  const rawGrid = extractRawSheetGrid(sheet, decodedRange);
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

  const tableRows = rawDataRows.map((row) =>
    Array.from({ length: maxColumns }, (_, colIndex) => normalizeTableCell((row || [])[colIndex]))
  );

  return {
    tableHeaders,
    tableHeaderGroups,
    tableRows,
    rawMatrix: rawGrid.rawMatrix,
    rawMerges: rawGrid.rawMerges,
    rawColWidths: rawGrid.rawColWidths,
    rawRowHeights: rawGrid.rawRowHeights,
    rawHiddenCols: rawGrid.rawHiddenCols,
    rawHiddenRows: rawGrid.rawHiddenRows,
  };
}

function extractExcelTableFromWorkbookBuffer(buffer: Buffer): PelaporanExcelTable {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, cellStyles: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    return {
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      rawMatrix: [],
      rawMerges: [],
      rawColWidths: [],
      rawRowHeights: [],
      rawHiddenCols: [],
      rawHiddenRows: [],
    };
  }

  return extractExcelTableFromSheet(workbook.Sheets[firstSheet]);
}

async function listPelaporanExcelSources(category: AllowedPelaporanCategory): Promise<PelaporanExcelSource[]> {
  await syncCategoryFromFilesystem(category);

  const docs = await listDocumentsByCategory(category);
  const recycledDocs = await listDeletedDocumentsByCategory(category);
  const recycledNameSet = new Set(
    recycledDocs
      .filter((doc) => isExcelFileName(doc.name))
      .map((doc) => String(doc.name || "").toLowerCase())
  );

  const sources = docs
    .filter((doc) => isExcelFileName(doc.name))
    .filter((doc) => !recycledNameSet.has(String(doc.name || "").toLowerCase()))
    .map((doc) => ({
      category,
      name: doc.name,
      url: doc.url,
      modifiedAt: doc.modifiedAt,
      size: doc.size,
      type: doc.type,
    }));

  return sources.sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt));
}

async function readTableFromExcel(selectedSource?: { category: AllowedPelaporanCategory; name: string }) {
  if (!selectedSource) {
    return {
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      rawMatrix: [],
      rawMerges: [],
      rawColWidths: [],
      rawRowHeights: [],
      rawHiddenCols: [],
      rawHiddenRows: [],
    };
  }

  const selectedPath = path.join(process.cwd(), "public", "assets", selectedSource.category, selectedSource.name);
  await access(selectedPath);
  const selectedBuffer = await readFile(selectedPath);
  return extractExcelTableFromWorkbookBuffer(selectedBuffer);
}

export async function PUT(request: Request) {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
  if (!session.user || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let body: {
    category?: unknown;
    sourceName?: unknown;
    tableHeaders?: unknown;
    tableHeaderGroups?: unknown;
    tableRows?: unknown;
  } = {};

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  const category = String(body.category || "").trim();
  const sourceName = String(body.sourceName || "").trim();

  if (!isAllowedPelaporanCategory(category)) {
    return NextResponse.json({ error: "Kategori pelaporan tidak valid" }, { status: 400 });
  }

  if (!sourceName) {
    return NextResponse.json({ error: "Sumber file harus dipilih" }, { status: 400 });
  }

  const tableHeaders = normalizeStringArray(body.tableHeaders);
  if (tableHeaders.length === 0) {
    return NextResponse.json({ error: "Header tabel tidak boleh kosong" }, { status: 400 });
  }

  const tableHeaderGroupsRaw = normalizeStringArray(body.tableHeaderGroups);
  const tableHeaderGroups = tableHeaders.map((header, index) => tableHeaderGroupsRaw[index] || header);
  const tableRows = normalizeRows(body.tableRows, tableHeaders.length);

  let availableSources: PelaporanExcelSource[] = [];
  try {
    availableSources = await listPelaporanExcelSources(category);
  } catch {
    return NextResponse.json({ error: "Gagal memuat sumber file" }, { status: 500 });
  }

  const sourceFile = availableSources.find((source) => source.name === sourceName) ?? null;
  if (!sourceFile) {
    return NextResponse.json({ error: "Sumber file tidak ditemukan atau sudah non-aktif" }, { status: 404 });
  }

  const sourcePath = path.join(process.cwd(), "public", "assets", sourceFile.category, sourceFile.name);

  try {
    await access(sourcePath);
    const originalBuffer = await readFile(sourcePath);
    const workbook = XLSX.read(originalBuffer, { type: "buffer", cellDates: false });
    const firstSheetName = workbook.SheetNames[0] || "Sheet1";
    const rowsForSheet = buildSheetRowsForPersist(tableHeaders, tableHeaderGroups, tableRows);
    const newSheet = XLSX.utils.aoa_to_sheet(rowsForSheet);

    workbook.Sheets[firstSheetName] = newSheet;
    if (!workbook.SheetNames.includes(firstSheetName)) {
      workbook.SheetNames.unshift(firstSheetName);
    }

    const bookType: XLSX.BookType = sourceFile.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
    const nextBuffer = XLSX.write(workbook, { type: "buffer", bookType });
    await writeFile(sourcePath, nextBuffer);

    await syncCategoryFromFilesystem(sourceFile.category);

    return NextResponse.json({ success: true, sourceName: sourceFile.name });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan perubahan tabel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const categoryParam = String(requestUrl.searchParams.get("category") || "").trim();

  if (!isAllowedPelaporanCategory(categoryParam)) {
    return NextResponse.json({
      error: "Kategori pelaporan tidak valid",
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      sourceFile: null,
      availableSources: [],
      source: "none",
    }, { status: 400 });
  }

  let availableSources: PelaporanExcelSource[] = [];
  try {
    availableSources = await listPelaporanExcelSources(categoryParam);
  } catch (sourceError) {
    console.warn("Failed to list pelaporan excel sources:", sourceError);
  }

  const requestedSourceName = requestUrl.searchParams.get("sourceName")?.trim() || "";
  const requestedSource = requestedSourceName
    ? availableSources.find((source) => source.name === requestedSourceName) ?? null
    : null;

  const sourceFile = requestedSource ?? availableSources[0] ?? null;

  if (!sourceFile) {
    return NextResponse.json({
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      sourceFile: null,
      availableSources,
      source: "none",
    });
  }

  try {
    const tableData = await readTableFromExcel({
      category: sourceFile.category,
      name: sourceFile.name,
    });

    return NextResponse.json({
      tableHeaders: tableData.tableHeaders,
      tableHeaderGroups: tableData.tableHeaderGroups,
      tableRows: tableData.tableRows,
      rawMatrix: tableData.rawMatrix,
      rawMerges: tableData.rawMerges,
      rawColWidths: tableData.rawColWidths,
      rawRowHeights: tableData.rawRowHeights,
      rawHiddenCols: tableData.rawHiddenCols,
      rawHiddenRows: tableData.rawHiddenRows,
      sourceFile,
      availableSources,
      source: tableData.tableRows.length > 0 ? "excel" : "none",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to read pelaporan excel source:", errorMessage);
    return NextResponse.json({
      tableHeaders: [],
      tableHeaderGroups: [],
      tableRows: [],
      sourceFile,
      availableSources,
      source: "none",
      error: "Gagal membaca file sumber",
    });
  }
}
