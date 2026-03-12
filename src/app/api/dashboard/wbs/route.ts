import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import * as XLSX from "xlsx";

function getWbsExcelPath() {
  if (process.env.WBS_CHART_FILE?.trim()) {
    return process.env.WBS_CHART_FILE.trim();
  }

  return path.join(
    os.homedir(),
    "Downloads",
    "DASHBOARD GCG",
    "DASHBOARD GCG",
    "3. PELAPORAN",
    "LAPORAN WBS (AKSES TERBATAS)",
    "Grafik Laporan WBS.xlsx"
  );
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

async function readWbsFromExcel() {
  const excelPath = getWbsExcelPath();
  await access(excelPath);

  const workbook = XLSX.readFile(excelPath, { cellDates: false });
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
  } catch (error) {
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

      return NextResponse.json({ data, source: "database" });
    } catch (dbError) {
      console.error("Failed to fetch WBS chart data", dbError);
      return NextResponse.json({ error: "Failed to fetch WBS chart data" }, { status: 500 });
    }
  }
}
