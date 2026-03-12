import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

type GcgScore = {
  year: string;
  value: number;
};

type DashboardSettingsRecord = {
  dashboard_title: string;
  dashboard_subtitle: string;
  kajian_2025: string;
  kajian_2024: string;
  iso_note: string;
  penghargaan_note: string;
  gcg_scores_json: string;
};

const DEFAULT_GCG_SCORES: GcgScore[] = [
  { year: "2020", value: 92.47 },
  { year: "2021", value: 93.85 },
  { year: "2022", value: 94.9 },
  { year: "2023", value: 88.51 },
  { year: "2024", value: 92.84 },
];

const DEFAULT_SETTINGS: DashboardSettingsRecord = {
  dashboard_title: "Improvement Dashboard GCG",
  dashboard_subtitle: "Meningkatkan Efektivitas dan Efisiensi Pengawasan GCG",
  kajian_2025: "100%",
  kajian_2024: "98%",
  iso_note: "Sertifikat SMAP tersedia dan dapat diakses langsung.",
  penghargaan_note: "Data penghargaan belum tersedia.",
  gcg_scores_json: JSON.stringify(DEFAULT_GCG_SCORES),
};

async function ensureDashboardSettingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS dashboard_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      dashboard_title TEXT NOT NULL,
      dashboard_subtitle TEXT NOT NULL,
      kajian_2025 TEXT NOT NULL,
      kajian_2024 TEXT NOT NULL,
      iso_note TEXT NOT NULL,
      penghargaan_note TEXT NOT NULL,
      gcg_scores_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(
    `
    INSERT OR IGNORE INTO dashboard_settings
      (id, dashboard_title, dashboard_subtitle, kajian_2025, kajian_2024, iso_note, penghargaan_note, gcg_scores_json)
    VALUES
      (1, ?, ?, ?, ?, ?, ?, ?)
    `,
    DEFAULT_SETTINGS.dashboard_title,
    DEFAULT_SETTINGS.dashboard_subtitle,
    DEFAULT_SETTINGS.kajian_2025,
    DEFAULT_SETTINGS.kajian_2024,
    DEFAULT_SETTINGS.iso_note,
    DEFAULT_SETTINGS.penghargaan_note,
    DEFAULT_SETTINGS.gcg_scores_json
  );
}

function normalizeGcgScores(input: unknown): GcgScore[] {
  if (!Array.isArray(input)) {
    return DEFAULT_GCG_SCORES;
  }

  const rows = input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const year = String((item as { year?: unknown }).year ?? "").trim();
      const value = Number((item as { value?: unknown }).value ?? NaN);
      if (!year || Number.isNaN(value)) {
        return null;
      }

      return { year, value };
    })
    .filter((item): item is GcgScore => item !== null);

  return rows.length > 0 ? rows : DEFAULT_GCG_SCORES;
}

async function getSettingsRow(): Promise<DashboardSettingsRecord> {
  await ensureDashboardSettingsTable();

  const rows = await prisma.$queryRawUnsafe<Array<DashboardSettingsRecord>>(
    `SELECT dashboard_title, dashboard_subtitle, kajian_2025, kajian_2024, iso_note, penghargaan_note, gcg_scores_json FROM dashboard_settings WHERE id = 1`
  );

  return rows[0] || DEFAULT_SETTINGS;
}

export async function GET() {
  try {
    const row = await getSettingsRow();
    const parsedScores = normalizeGcgScores(JSON.parse(row.gcg_scores_json));

    return NextResponse.json({
      dashboardTitle: row.dashboard_title,
      dashboardSubtitle: row.dashboard_subtitle,
      kajian2025: row.kajian_2025,
      kajian2024: row.kajian_2024,
      isoNote: row.iso_note,
      penghargaanNote: row.penghargaan_note,
      gcgScores: parsedScores,
    });
  } catch (error) {
    console.error("Failed to load dashboard settings", error);
    return NextResponse.json({ error: "Gagal memuat pengaturan dashboard" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["SUPERADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Terlarang. Hanya Admin/Staff yang dapat mengubah dashboard." }, { status: 403 });
    }

    const body = await req.json();

    const dashboardTitle = String(body.dashboardTitle ?? DEFAULT_SETTINGS.dashboard_title).trim() || DEFAULT_SETTINGS.dashboard_title;
    const dashboardSubtitle = String(body.dashboardSubtitle ?? DEFAULT_SETTINGS.dashboard_subtitle).trim() || DEFAULT_SETTINGS.dashboard_subtitle;
    const kajian2025 = String(body.kajian2025 ?? DEFAULT_SETTINGS.kajian_2025).trim() || DEFAULT_SETTINGS.kajian_2025;
    const kajian2024 = String(body.kajian2024 ?? DEFAULT_SETTINGS.kajian_2024).trim() || DEFAULT_SETTINGS.kajian_2024;
    const isoNote = String(body.isoNote ?? DEFAULT_SETTINGS.iso_note).trim() || DEFAULT_SETTINGS.iso_note;
    const penghargaanNote = String(body.penghargaanNote ?? DEFAULT_SETTINGS.penghargaan_note).trim() || DEFAULT_SETTINGS.penghargaan_note;
    const gcgScores = normalizeGcgScores(body.gcgScores);

    await ensureDashboardSettingsTable();
    await prisma.$executeRawUnsafe(
      `
      UPDATE dashboard_settings
      SET dashboard_title = ?,
          dashboard_subtitle = ?,
          kajian_2025 = ?,
          kajian_2024 = ?,
          iso_note = ?,
          penghargaan_note = ?,
          gcg_scores_json = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      `,
      dashboardTitle,
      dashboardSubtitle,
      kajian2025,
      kajian2024,
      isoNote,
      penghargaanNote,
      JSON.stringify(gcgScores)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update dashboard settings", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan dashboard" }, { status: 500 });
  }
}
