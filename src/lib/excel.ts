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

type ExcelSource = {
    category: string;
    fileName: string;
    modifiedMs: number;
};

export type PenyuapanRiskRow = {
    id: string;
    risk: string;
    level: "Low" | "Medium" | "High" | "Extreme";
    impact: number;
    likelihood: number;
    owner: string;
    trend: "up" | "down" | "same";
    inherentScore: number;
    residualScore: number;
};

function containsAnyKeyword(value: unknown, keywords: string[]) {
    const text = String(value || "").toLowerCase();
    return keywords.some((keyword) => text.includes(keyword));
}

function toFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }

    const normalized = String(value ?? "")
        .replace(/\u00a0/g, " ")
        .replace(/,/g, ".")
        .trim();

    if (!normalized) {
        return null;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
}

function clampRiskAxis(value: number | null, fallback: number): number {
    const source = value ?? fallback;
    if (!Number.isFinite(source)) return fallback;
    return Math.max(1, Math.min(5, Math.round(source)));
}

function normalizeRiskLevel(value: unknown, fallbackScore = 0): "Low" | "Medium" | "High" | "Extreme" {
    const text = String(value || "")
        .replace(/\u00a0/g, " ")
        .trim()
        .toLowerCase();

    if (/extreme|ekstrim/.test(text)) return "Extreme";
    if (/high|tinggi/.test(text)) return "High";
    if (/medium|menengah|moderate/.test(text)) return "Medium";
    if (/low|rendah/.test(text)) return "Low";

    if (fallbackScore >= 20) return "Extreme";
    if (fallbackScore >= 12) return "High";
    if (fallbackScore >= 6) return "Medium";
    return "Low";
}

function normalizeTrendFromScores(inherentScore: number, residualScore: number): "up" | "down" | "same" {
    if (residualScore < inherentScore) return "down";
    if (residualScore > inherentScore) return "up";
    return "same";
}

function inferAxisFromLevel(level: "Low" | "Medium" | "High" | "Extreme") {
    if (level === "Extreme") return { impact: 5, likelihood: 5 };
    if (level === "High") return { impact: 4, likelihood: 4 };
    if (level === "Medium") return { impact: 3, likelihood: 3 };
    return { impact: 2, likelihood: 2 };
}

function parsePenyuapanRiskRows(sheet: XLSX.WorkSheet): PenyuapanRiskRow[] {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (rows.length === 0) return [];

    const firstHeader = (rows[0] || []).map((cell) => String(cell || "").toLowerCase());
    const earlyRows = rows.slice(0, 6).map((row) => row.map((cell) => String(cell || "").toLowerCase()));

    const isProfileTemplate2022Plus =
        firstHeader.some((text) => text.includes("peristiwa risiko")) &&
        firstHeader.some((text) => text.includes("risiko inherent"));

    const isProfileTemplate2021 =
        firstHeader.some((text) => text.includes("profil risiko")) &&
        firstHeader.some((text) => text.includes("level risiko"));

    const isMonitoringTemplate = earlyRows.some((row) =>
        row.some((text) => text.includes("risk register") || text.includes("profil risiko penyuapan"))
    );

    if (isProfileTemplate2022Plus) {
        const parsed = rows
            .slice(2)
            .map((row, index) => {
                const risk = String(row[1] || "").trim();
                if (!risk) return null;

                const rawInherentLikelihood = toFiniteNumber(row[2]);
                const rawInherentImpact = toFiniteNumber(row[3]);
                const inherentLikelihood = clampRiskAxis(rawInherentLikelihood, 3);
                const inherentImpact = clampRiskAxis(rawInherentImpact, 3);
                const inherentScore = toFiniteNumber(row[4]) ?? inherentLikelihood * inherentImpact;

                const rawResidualLikelihood = toFiniteNumber(row[6]);
                const rawResidualImpact = toFiniteNumber(row[7]);
                const residualLikelihood = clampRiskAxis(rawResidualLikelihood, inherentLikelihood);
                const residualImpact = clampRiskAxis(rawResidualImpact, inherentImpact);
                const residualScore = toFiniteNumber(row[8]) ?? residualLikelihood * residualImpact;

                const level = normalizeRiskLevel(row[9] || row[5], residualScore);
                const owner = String(row[10] || "").trim() || "Unknown";
                const numericId = toFiniteNumber(row[0]);
                const id = numericId !== null ? String(Math.round(numericId)) : `RISK-${index + 1}`;

                return {
                    id,
                    risk,
                    level,
                    impact: residualImpact,
                    likelihood: residualLikelihood,
                    owner,
                    trend: normalizeTrendFromScores(inherentScore, residualScore),
                    inherentScore,
                    residualScore,
                } as PenyuapanRiskRow;
            })
            .filter((item): item is PenyuapanRiskRow => item !== null);

        if (parsed.length > 0) {
            return parsed;
        }
    }

    if (isProfileTemplate2021) {
        const parsed = rows
            .slice(1)
            .map((row, index) => {
                const risk = String(row[1] || "").trim();
                if (!risk) return null;

                const score = toFiniteNumber(row[2]) ?? 9;
                const level = normalizeRiskLevel(row[3], score);
                const owner = String(row[4] || "").trim() || "Unknown";
                const inferredAxis = inferAxisFromLevel(level);
                const numericId = toFiniteNumber(row[0]);
                const id = numericId !== null ? String(Math.round(numericId)) : `RISK-${index + 1}`;

                return {
                    id,
                    risk,
                    level,
                    impact: inferredAxis.impact,
                    likelihood: inferredAxis.likelihood,
                    owner,
                    trend: "same",
                    inherentScore: score,
                    residualScore: score,
                } as PenyuapanRiskRow;
            })
            .filter((item): item is PenyuapanRiskRow => item !== null);

        if (parsed.length > 0) {
            return parsed;
        }
    }

    if (isMonitoringTemplate) {
        const parsed = rows
            .map((row, index) => {
                const rowNumber = toFiniteNumber(row[1]);
                const risk = String(row[3] || "").trim();
                if (rowNumber === null || !risk) {
                    return null;
                }

                const inherentLikelihood = clampRiskAxis(toFiniteNumber(row[12]), 3);
                const inherentImpact = clampRiskAxis(toFiniteNumber(row[13]), 3);
                const inherentScore = inherentLikelihood * inherentImpact;

                const residualLikelihood = clampRiskAxis(
                    toFiniteNumber(row[28]) ?? toFiniteNumber(row[26]) ?? toFiniteNumber(row[24]) ?? toFiniteNumber(row[22]),
                    inherentLikelihood
                );
                const residualImpact = clampRiskAxis(
                    toFiniteNumber(row[29]) ?? toFiniteNumber(row[27]) ?? toFiniteNumber(row[25]) ?? toFiniteNumber(row[23]),
                    inherentImpact
                );
                const residualScore = residualLikelihood * residualImpact;

                const level = normalizeRiskLevel(row[21], residualScore);
                const owner = String(row[30] || "").trim() || "Unknown";

                return {
                    id: String(Math.round(rowNumber) || index + 1),
                    risk,
                    level,
                    impact: residualImpact,
                    likelihood: residualLikelihood,
                    owner,
                    trend: normalizeTrendFromScores(inherentScore, residualScore),
                    inherentScore,
                    residualScore,
                } as PenyuapanRiskRow;
            })
            .filter((item): item is PenyuapanRiskRow => item !== null);

        if (parsed.length > 0) {
            return parsed;
        }
    }

    const genericRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    return genericRows
        .map((row, index) => {
            const risk = String(
                row["Peristiwa Risiko"] ?? row["Profil Risiko"] ?? row["Risk Event"] ?? row["Risk"] ?? ""
            ).trim();
            if (!risk) {
                return null;
            }

            const rawLikelihood =
                toFiniteNumber(row["K"]) ??
                toFiniteNumber(row["Likelihood"]) ??
                toFiniteNumber(row["Kemungkinan"]) ??
                3;

            const rawImpact =
                toFiniteNumber(row["D"]) ??
                toFiniteNumber(row["Impact"]) ??
                toFiniteNumber(row["Dampak"]) ??
                3;

            const likelihood = clampRiskAxis(rawLikelihood, 3);
            const impact = clampRiskAxis(rawImpact, 3);
            const score = toFiniteNumber(row["Level"]) ?? likelihood * impact;
            const level = normalizeRiskLevel(
                row["R/M/T/E"] ?? row["Kategori Level Risiko"] ?? row["Risk Level"],
                score
            );

            return {
                id: String(row["No"] ?? row["Peringkat Risiko"] ?? `RISK-${index + 1}`),
                risk,
                level,
                impact,
                likelihood,
                owner: String(row["Pemilik Risiko"] ?? row["Owner"] ?? "Unknown").trim() || "Unknown",
                trend: "same",
                inherentScore: score,
                residualScore: score,
            } as PenyuapanRiskRow;
        })
        .filter((item): item is PenyuapanRiskRow => item !== null);
}

export async function getPenyuapanRiskRows(category = "pelaporan_penyuapan"): Promise<PenyuapanRiskRow[]> {
    const excelSources = await listLatestExcelSources(category);
    if (excelSources.length === 0) {
        return [];
    }

    for (const source of excelSources) {
        try {
            const buffer = await readFile(path.join(getCategoryUploadDir(source.category), source.fileName));
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                continue;
            }

            const parsedRows = parsePenyuapanRiskRows(workbook.Sheets[sheetName]);
            if (parsedRows.length > 0) {
                return parsedRows;
            }
        } catch (error) {
            console.error(
                `[ExcelLib] Gagal membaca template risiko penyuapan dari ${source.category}/${source.fileName}:`,
                error
            );
        }
    }

    return [];
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

function getCategoryReadCandidates(category: string): string[] {
    // Professional behavior: each report reads only its own category.
    return [category];
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

async function listLatestExcelSources(category: string): Promise<ExcelSource[]> {
    const candidates = getCategoryReadCandidates(category);
    const sources: ExcelSource[] = [];

    for (const candidate of candidates) {
        const files = (await listActiveCategoryFileNames(candidate)).filter(isExcelFileName);
        files.forEach((fileName) => {
            sources.push({
                category: candidate,
                fileName,
                modifiedMs: getFileModifiedMs(candidate, fileName),
            });
        });
    }

    return sources.sort((a, b) => b.modifiedMs - a.modifiedMs);
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
    if (category === "pelaporan_penyuapan") {
        const riskRows = await getPenyuapanRiskRows(category);
        if (riskRows.length > 0) {
            const totalRisks = riskRows.length;
            const highPriority = riskRows.filter((row) => row.level === "High" || row.level === "Extreme").length;
            const mitigated = riskRows.filter((row) => row.residualScore < row.inherentScore).length;
            return [totalRisks, highPriority, mitigated];
        }
    }

    const excelSources = await listLatestExcelSources(category);
    if (excelSources.length === 0) return [0, 0, 0];

    const latestSource = excelSources[0];
    const uploadDir = getCategoryUploadDir(latestSource.category);
    const latestFile = latestSource.fileName;

    try {
        const buffer = await readFile(path.join(uploadDir, latestFile));
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) return [0, 0, 0];

        // Konversi ke format array-of-arrays (header: 1) untuk ekstraksi nilai numerik mentah
        const data = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1 });
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
        console.error(`[ExcelLib] Gagal memproses file ${latestSource.category}/${latestFile}:`, e);
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

        const data = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1 });
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
