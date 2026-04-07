import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";
import { listDocumentsByCategory, syncCategoryFromFilesystem } from "@/lib/documentStore";

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

async function getRiskExcelPath() {
  try {
    await syncCategoryFromFilesystem("pelaporan_risiko");
    const docs = await listDocumentsByCategory("pelaporan_risiko");
    const latestExcel = docs
      .filter((doc) => isExcelFileName(doc.name))
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))[0];

    if (latestExcel) {
      return path.join(process.cwd(), "public", "assets", "pelaporan_risiko", latestExcel.name);
    }
  } catch {
    // Keep empty fallback behavior below.
  }
  return "";
}

async function readRiskFromExcel() {
  const excelPath = await getRiskExcelPath();
  if (!excelPath) {
    throw new Error("Tidak ada file Excel Risiko di sistem Arsip.");
  }
  await access(excelPath);

  const buffer = await readFile(excelPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) return [];

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows
    .map((row, index) => {
      const fallbackId = `RISK-${index + 1}`;
      const id = String(
        row["id"] ??
          row["ID"] ??
          row["Id"] ??
          row["No"] ??
          row["no"] ??
          row["ID Risiko"] ??
          row["Id Risiko"] ??
          row["Kode Risiko"] ??
          fallbackId
      ).trim();

      const risk = String(
        row["risk"] ??
          row["Risk Event"] ??
          row["Risk"] ??
          row["Deskripsi Risiko"] ??
          row["Risiko"] ??
          ""
      ).trim();

      if (!risk && id === fallbackId) return null;

      const level = normalizeRiskLevel(row["level"] ?? row["Level"] ?? row["Tingkat Risiko Akhir"] ?? row["Risk Level"]);

      const rawImpact = toFiniteNumber(row["impact"] ?? row["Impact"] ?? row["Dampak"] ?? row["Skor Dampak"]);
      const rawLikelihood = toFiniteNumber(row["likelihood"] ?? row["Likelihood"] ?? row["Kemungkinan"] ?? row["Skor Kemungkinan"] ?? row["Probabilitas"]);

      const inferred = inferImpactLikelihood(level);
      const impact = clampMatrixValue(rawImpact ?? inferred.impact);
      const likelihood = clampMatrixValue(rawLikelihood ?? inferred.likelihood);

      return {
        id: id || fallbackId,
        risk,
        level,
        impact,
        likelihood,
        owner: String(row["owner"] ?? row["Owner"] ?? row["Unit Kerja"] ?? row["Department"] ?? row["Divisi"] ?? "Unknown").trim(),
        trend: normalizeTrend(row["trend"] ?? row["Trend"] ?? row["status"] ?? row["Status"]),
      };
    })
    .filter((item) => item !== null);
}

export async function GET() {
  try {
    const excelData = await readRiskFromExcel();
    if (excelData.length > 0) {
      return NextResponse.json({ data: excelData, source: "excel" });
    }
    return NextResponse.json({ data: [], source: "database" });
  } catch (error: any) {
    console.warn("Risk Excel source unavailable, fallback backward compat to database:", error.message);
    try {
      const rows = await prisma.dataLaporan.findMany({
        where: { department: "RISK_PROFILE" },
        orderBy: { id: "asc" },
        select: {
          kode_jabatan: true,
          jabatan_lengkap: true,
          status_approved: true,
          pers_no: true,
          nik: true,
          divisi: true,
          direktorat: true,
        },
      });

      const data = rows.map((row) => ({
        id: row.kode_jabatan || "-",
        risk: row.jabatan_lengkap || "-",
        level: row.status_approved || "Medium",
        impact: Number(row.pers_no || 0),
        likelihood: Number(row.nik || 0),
        owner: row.divisi || "Unknown",
        trend: row.direktorat || "same",
      }));

      return NextResponse.json({ data, source: "database" });
    } catch (dbError) {
      console.error("Failed to fetch risk profile data", dbError);
      return NextResponse.json({ error: "Failed to fetch risk profile data" }, { status: 500 });
    }
  }
}
