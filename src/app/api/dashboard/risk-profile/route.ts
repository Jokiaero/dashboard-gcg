import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.dataLaporan.findMany({
      where: {
        department: "RISK_PROFILE",
      },
      orderBy: {
        id: "asc",
      },
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

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Failed to fetch risk profile data", error);
    return NextResponse.json({ error: "Failed to fetch risk profile data" }, { status: 500 });
  }
}
