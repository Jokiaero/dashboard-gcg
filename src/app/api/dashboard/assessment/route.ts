import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { existsSync, readdirSync, statSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import * as XLSX from "xlsx";

function getAssessmentExcelPath() {
  const uploadDir = path.join(process.cwd(), "public", "assets", "assessment");
  if (existsSync(uploadDir)) {
    const excelFiles = readdirSync(uploadDir)
      .filter((file) => file.toLowerCase().endsWith(".xlsx") || file.toLowerCase().endsWith(".xls"))
      .sort((a, b) => statSync(path.join(uploadDir, b)).mtimeMs - statSync(path.join(uploadDir, a)).mtimeMs);

    if (excelFiles.length > 0) {
      return path.join(uploadDir, excelFiles[0]);
    }
  }
  return "";
}

async function readAssessmentFromExcel() {
  const excelPath = getAssessmentExcelPath();
  if (!excelPath) {
    throw new Error("Tidak ada file Excel Assessment di sistem Arsip.");
  }
  await access(excelPath);

  const buffer = await readFile(excelPath);
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  
  let radarData: any[] = [];
  let yearlyScores: any[] = [];

  // Pindai semua Sheet untuk menebak isi baris
  for (const sheetName of workbook.SheetNames) {
    const targetSheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(targetSheet, { header: 1 });

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const c1 = row[0];
      const c2 = Number(row[1]);
      const c3 = Number(row[2]);

      // Jika Baris memiliki 3 kolom (Teks, Angka, Angka) => Asumsikan Radar Chart (Aspek, Skor Baru, Skor Lama)
      if (typeof c1 === "string" && c1.trim() !== "" && !isNaN(c2) && !isNaN(c3) && row[1] !== "" && row[2] !== "") {
        radarData.push({
          subject: c1.trim(),
          A: c2,
          B: c3,
          fullMark: 100
        });
      } 
      // Jika Baris hanya memiliki 2 kolom (Teks/Angka, Angka) => Asumsikan Line Chart (Tahun, Skor)
      else if (c1 != null && String(c1).trim() !== "" && !isNaN(c2) && row[1] !== "") {
        yearlyScores.push({
          year: String(c1).trim(),
          skor: c2
        });
      }
    }
  }

  // Jika tidak menemukan data radar, gunakan 5 aspek standar sebagai default
  if (radarData.length === 0) {
     radarData = [
        { subject: "Transparansi", A: 85, B: 80, fullMark: 100 },
        { subject: "Akuntabilitas", A: 90, B: 85, fullMark: 100 },
        { subject: "Responsibilitas", A: 88, B: 82, fullMark: 100 },
        { subject: "Independensi", A: 92, B: 87, fullMark: 100 },
        { subject: "Kewajaran", A: 86, B: 84, fullMark: 100 },
     ];
  }

  return { radarData, yearlyScores };
}

export async function GET() {
  try {
    const excelData = await readAssessmentFromExcel();
    return NextResponse.json({ 
      data: excelData, 
      source: "excel" 
    });
  } catch (error: any) {
    console.warn("Assessment Excel source unavailable:", error.message);
    // Return empty arrays format if nothing uploaded
    return NextResponse.json({ 
      data: { radarData: [], yearlyScores: [] }, 
      source: "empty" 
    });
  }
}
