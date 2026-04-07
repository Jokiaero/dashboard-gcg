import { existsSync, readdirSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { listDocumentsByCategory, syncCategoryFromFilesystem } from "@/lib/documentStore";

type CategoryFileSummary = {
    totalFiles: number;
    excelFiles: number;
    pdfFiles: number;
};

function containsAnyKeyword(value: unknown, keywords: string[]) {
    const text = String(value || "").toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
}

function getPpgFallbackStats(sheet: XLSX.WorkSheet): number[] {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    const nonEmptyRows = rows.filter((row) =>
        Object.values(row).some((cell) => String(cell ?? "").trim() !== "")
    );

    if (nonEmptyRows.length === 0) return [0, 0, 0];

    const totalPrograms = nonEmptyRows.length;
    let runningPrograms = 0;
    let completedPrograms = 0;

    for (const row of nonEmptyRows) {
        const statusCandidate =
            row["Status"] ?? row["status"] ?? row["Progress"] ?? row["progress"] ?? "";

        const metricCandidate =
            row["Metrik Keberhasilan (Output)"] ??
            row["Metrik Keberhasilan"] ??
            row["Output"] ??
            row["Keterangan / Eviden"] ??
            row["Keterangan"] ??
            "";

        if (containsAnyKeyword(statusCandidate, ["in progress", "ongoing", "berjalan", "open", "proses"])) {
            runningPrograms += 1;
        }

        if (containsAnyKeyword(statusCandidate, ["done", "closed", "selesai", "tuntas", "complete"])) {
            completedPrograms += 1;
            continue;
        }

        // If explicit status is absent, infer completion from success metric/evidence text.
        if (containsAnyKeyword(metricCandidate, ["100%", "selesai", "tuntas", "terbit", "closed", "done"])) {
            completedPrograms += 1;
        }
    }

    if (runningPrograms === 0) {
        runningPrograms = totalPrograms;
    }

    return [totalPrograms, runningPrograms, completedPrograms];
}

function isExcelFileName(fileName: string) {
    const lower = String(fileName || "").toLowerCase();
    return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function isPdfFileName(fileName: string) {
    return String(fileName || "").toLowerCase().endsWith(".pdf");
}

function getCategoryUploadDir(category: string) {
    return path.join(process.cwd(), "public", "assets", category);
}

function listFilesystemFileNames(category: string): string[] {
    const uploadDir = getCategoryUploadDir(category);
    if (!existsSync(uploadDir)) return [];
    return readdirSync(uploadDir).filter((file) => !file.startsWith("."));
}

function getFileModifiedMs(category: string, fileName: string): number {
    const filePath = path.join(getCategoryUploadDir(category), fileName);
    if (!existsSync(filePath)) return 0;
    return statSync(filePath).mtimeMs;
}

function getLatestFileNameByModified(category: string, fileNames: string[]): string {
    const sorted = [...fileNames].sort(
        (a, b) => getFileModifiedMs(category, b) - getFileModifiedMs(category, a)
    );
    return sorted[0] || "";
}

async function listActiveCategoryFileNames(category: string): Promise<string[]> {
    try {
        await syncCategoryFromFilesystem(category);
        const activeDocs = await listDocumentsByCategory(category);
        return activeDocs
            .map((doc) => String(doc.name || "").trim())
            .filter(Boolean);
    } catch {
        // Backward compatible fallback if DB/store temporarily unavailable.
        return listFilesystemFileNames(category);
    }
}

export async function getCategoryFileSummary(category: string): Promise<CategoryFileSummary> {
    const files = await listActiveCategoryFileNames(category);

    return {
        totalFiles: files.length,
        excelFiles: files.filter(isExcelFileName).length,
        pdfFiles: files.filter(isPdfFileName).length,
    };
}

/**
 * Membaca nilai statistik [total, in-progress, completed] dari file Excel terbaru di kategori tertentu.
 * Digunakan untuk mengisi kartu metrik (KRI) di halaman laporan GCG.
 */
export async function getExcelStats(category: string): Promise<number[]> {
    const uploadDir = getCategoryUploadDir(category);
    const files = (await listActiveCategoryFileNames(category)).filter(isExcelFileName);
    
    if (files.length === 0) return [0, 0, 0];

    const latestFile = getLatestFileNameByModified(category, files);
    if (!latestFile) return [0, 0, 0];

    try {
        const buffer = await readFile(path.join(uploadDir, latestFile));
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return [0, 0, 0];

        // Konversi ke format array-of-arrays (header: 1) untuk ekstraksi nilai numerik mentah
        const data = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1 });
        const extracted: number[] = [];
        
        // Loop mulai baris ke-2 (index 1) untuk melewati header
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (Array.isArray(row)) {
                // Cari angka pertama yang ditemukan dari kiri di setiap baris
                for (let j = 0; j < row.length; j++) {
                    const val = Number(row[j]);
                    if (!isNaN(val) && row[j] !== "" && row[j] !== null && typeof row[j] !== "boolean") {
                        extracted.push(val);
                        break; 
                    }
                }
            }
        }

        if (extracted.length === 0 && category === "pelaporan_ppg") {
            return getPpgFallbackStats(workbook.Sheets[sheetName]);
        }

        // Kembalikan 3 angka pertama atau 0 jika tidak ditemukan
        return [
            extracted.length > 0 ? extracted[0] : 0,
            extracted.length > 1 ? extracted[1] : 0,
            extracted.length > 2 ? extracted[2] : 0,
        ];
    } catch (e) {
        console.error(`[ExcelLib] Gagal memproses file ${latestFile}:`, e);
        return [0, 0, 0];
    }
}

/**
 * Memformat angka untuk tampilan UI (persentase jika <1, atau format ribuan Indonesia).
 */
export function formatExcelValue(v: number) {
    if (v > 0 && v <= 1) return (v * 100).toFixed(0) + "%";
    return v.toLocaleString("id-ID");
}

/**
 * Membaca seri tahun dan persentase approval dari file Excel terbaru kategori Approval Kepatuhan.
 * Ekspektasi format minimal: kolom pertama = tahun, kolom kedua = nilai approval.
 */
export async function getApprovalKepatuhanSeries(category = "approval_kepatuhan"): Promise<Array<{ year: number; value: number }>> {
    const uploadDir = getCategoryUploadDir(category);
    const files = (await listActiveCategoryFileNames(category)).filter(isExcelFileName);

    if (files.length === 0) return [];

    const latestFile = getLatestFileNameByModified(category, files);
    if (!latestFile) return [];

    try {
        const buffer = await readFile(path.join(uploadDir, latestFile));
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return [];

        const data = XLSX.utils.sheet_to_json<any[]>(workbook.Sheets[sheetName], { header: 1 });
        const series: Array<{ year: number; value: number }> = [];

        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!Array.isArray(row)) continue;

            let year = Number(row[0]);
            let value = Number(row[1]);

            if (!Number.isFinite(year) || !Number.isFinite(value)) {
                const numericValues = row
                    .map((cell) => Number(cell))
                    .filter((num) => Number.isFinite(num));

                if (numericValues.length >= 2) {
                    year = numericValues[0];
                    value = numericValues[1];
                }
            }

            if (!Number.isFinite(year) || !Number.isFinite(value)) continue;

            if (value > 1 && value <= 100) {
                value = value / 100;
            }

            series.push({ year, value });
        }

        return series.sort((a, b) => a.year - b.year);
    } catch (e) {
        console.error(`[ExcelLib] Gagal memproses approval file ${latestFile}:`, e);
        return [];
    }
}
