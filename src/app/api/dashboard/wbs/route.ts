import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";
import { listDocumentsByCategory, syncCategoryFromFilesystem } from "@/lib/documentStore";

function isExcelFileName(fileName: string) {
  const lower = String(fileName || "").toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

async function getWbsExcelPath() {
  if (process.env.WBS_CHART_FILE?.trim()) {
    return process.env.WBS_CHART_FILE.trim();
  }

  try {
    await syncCategoryFromFilesystem("pelaporan_wbs");
    const docs = await listDocumentsByCategory("pelaporan_wbs");
    const latestExcel = docs
      .filter((doc) => isExcelFileName(doc.name))
      .sort((a, b) => Date.parse(b.modifiedAt) - Date.parse(a.modifiedAt))[0];

    if (latestExcel) {
      return path.join(process.cwd(), "public", "assets", "pelaporan_wbs", latestExcel.name);
    }
  } catch {
    // Keep fallback behavior below.
  }

  // Jika tidak ada file tersimpan, kembalikan string kosong agar sistem jatuh ke fallback "database" secara alami
  return "";
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readWbsFromExcel() {
  const excelPath = await getWbsExcelPath();
  if (!excelPath) {
    throw new Error("Tidak ada file Excel WBS di sistem Arsip.");
  }
  await access(excelPath);

  const buffer = await readFile(excelPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  return rows
    .map((row) => {
      const tahun = String(row["Tahun"] ?? row["tahun"] ?? "").trim();
      const laporanWbs = toNumber(row["Laporan WBS"] ?? row["laporan_wbs"] ?? row["JUMLAH_LAPORAN_WBS"]);
      const ditindaklanjuti = toNumber(
        row["Status Laporan Ditindaklanjuti"] ??
          row["status_laporan_ditindaklanjuti"] ??
          row["DITINDAKLANJUTI"]
      );

      if (!tahun) {
        return null;
      }

      return {
        tahun,
        laporanWbs,
        ditindaklanjuti,
      };
    })
    .filter((item): item is { tahun: string; laporanWbs: number; ditindaklanjuti: number } => item !== null)
    .sort((a, b) => a.tahun.localeCompare(b.tahun, "id"));
}

export async function GET() {
  try {
    const excelData = await readWbsFromExcel();
    if (excelData.length > 0) {
      return NextResponse.json({ data: excelData, source: "excel" });
    }

    const rows = await prisma.dataLaporan.findMany({
      where: {
        department: "WBS",
        tahun: {
          not: null,
        },
      },
      orderBy: {
        tahun: "asc",
      },
      select: {
        tahun: true,
        pers_no: true,
        status_approved: true,
      },
    });

    const data = rows.map((row) => ({
      tahun: row.tahun || "-",
      laporanWbs: Number(row.pers_no || 0),
      ditindaklanjuti: Number(row.status_approved || 0),
    }));

    return NextResponse.json({ data, source: "database" });
  } catch (error: any) {
    console.warn("WBS Excel source unavailable, fallback to database", error);

    try {
      const rows = await prisma.dataLaporan.findMany({
        where: {
          department: "WBS",
          tahun: {
            not: null,
          },
        },
        orderBy: {
          tahun: "asc",
        },
        select: {
          tahun: true,
          pers_no: true,
          status_approved: true,
        },
      });

      const data = rows.map((row) => ({
        tahun: row.tahun || "-",
        laporanWbs: Number(row.pers_no || 0),
        ditindaklanjuti: Number(row.status_approved || 0),
      }));

      return NextResponse.json({ data, source: "database", debugError: error.message, stack: error.stack });
    } catch (dbError) {
      console.error("Failed to fetch WBS chart data", dbError);
      return NextResponse.json({ error: "Failed to fetch WBS chart data" }, { status: 500 });
    }
  }
}
