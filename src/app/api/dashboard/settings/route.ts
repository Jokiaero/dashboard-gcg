import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { REGULASI_DEFAULT_ORDER_FILE_NAMES, REGULASI_DOCS_BY_SLUG, getRegulasiFileNameBySlug } from "@/lib/regulasiDocuments";
import { SOFTSTRUCTURE_DEFAULT_ORDER_FILE_NAMES } from "@/lib/softstructureDocuments";
import { KAJIAN_DEFAULT_ORDER_FILE_NAMES } from "@/lib/kajianDocuments";
import { isVipRole } from "@/lib/roles";

type GcgScore = {
  year: string;
  value: number;
};

type DashboardMeta = {
  gcgScores: GcgScore[];
  riskProfileSourceName: string;
};

type DashboardSettingsRecord = {
  dashboardTitle: string;
  dashboardSubtitle: string;
  kajian2025: string;
  kajian2024: string;
  isoNote: string;
  penghargaanNote: string;
  penghargaanUrl: string | null;
  regulasiOrder: string | null;
  softstructureOrder: string | null;
  kajianOrder: string | null;
  gcgScoresJson: string;
};

const DEFAULT_REGULASI_ORDER = [...REGULASI_DEFAULT_ORDER_FILE_NAMES];
const DEFAULT_SOFTSTRUCTURE_ORDER = [...SOFTSTRUCTURE_DEFAULT_ORDER_FILE_NAMES];
const DEFAULT_KAJIAN_ORDER = [...KAJIAN_DEFAULT_ORDER_FILE_NAMES];
const LEGACY_REGULASI_SLUG_SET = new Set(Object.keys(REGULASI_DOCS_BY_SLUG));

const DEFAULT_GCG_SCORES: GcgScore[] = [
  { year: "2020", value: 92.47 },
  { year: "2021", value: 93.85 },
  { year: "2022", value: 94.9 },
  { year: "2023", value: 88.51 },
  { year: "2024", value: 92.84 },
];

const DEFAULT_DASHBOARD_META: DashboardMeta = {
  gcgScores: DEFAULT_GCG_SCORES,
  riskProfileSourceName: "",
};

const DEFAULT_SETTINGS: DashboardSettingsRecord = {
  dashboardTitle: "DASHBOARD GCG",
  dashboardSubtitle: "Meningkatkan Efektivitas dan Efisiensi Pengawasan GCG",
  kajian2025: "100%",
  kajian2024: "98%",
  isoNote: "Sertifikasi SNI ISO 37001:2016 tersedia dan dapat diakses langsung.",
  penghargaanNote: "",
  penghargaanUrl: "",
  regulasiOrder: JSON.stringify(DEFAULT_REGULASI_ORDER),
  softstructureOrder: JSON.stringify(DEFAULT_SOFTSTRUCTURE_ORDER),
  kajianOrder: JSON.stringify(DEFAULT_KAJIAN_ORDER),
  gcgScoresJson: JSON.stringify(DEFAULT_DASHBOARD_META),
};

const LEGACY_ISO_NOTE = "Sertifikat SMAP tersedia dan dapat diakses langsung.";
const LEGACY_PENGHARGAAN_NOTE = "Data penghargaan belum tersedia.";
const LEGACY_SEEDED_PENGHARGAAN_NOTE = "The Most Committed GRC Leader 2025 untuk Direktur Utama SMBR.\nTOP GRC Awards 2025 #4Stars untuk kategori Perusahaan.\nPenghargaan lainnya di tahun sebelumnya.";
const LEGACY_SEEDED_PENGHARGAAN_URL = "https://semenbaturaja.co.id/komitmen-grc-berbuah-manis-semen-baturaja-kembali-dianugerahi-top-grc-awards-2025/";

function normalizeExternalUrl(rawValue: unknown): string {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return "";

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

function parsePenghargaanUrls(rawValue: unknown): string[] {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        const value = String(item ?? "").trim();
        if (!value) return "";
        return normalizeExternalUrl(value);
      });
    }
  } catch {
    // Backward compatibility: legacy plain single URL.
  }

  const legacyUrl = normalizeExternalUrl(raw);
  return legacyUrl ? [legacyUrl] : [];
}

function serializePenghargaanUrls(urls: string[]): string {
  if (!Array.isArray(urls) || urls.length === 0) {
    return "";
  }
  return JSON.stringify(urls.map((url) => String(url || "").trim()));
}

function normalizeRegulasiOrder(rawValue: unknown): string[] {
  const rawList = Array.isArray(rawValue)
    ? rawValue
    : (() => {
        try {
          const parsed = JSON.parse(String(rawValue ?? ""));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  const seen = new Set<string>();
  const normalized: string[] = [];

  rawList.forEach((item) => {
    const raw = String(item ?? "").trim();
    if (!raw) {
      return;
    }

    const fileName = LEGACY_REGULASI_SLUG_SET.has(raw)
      ? (getRegulasiFileNameBySlug(raw) || raw)
      : raw;

    if (!fileName || seen.has(fileName)) {
      return;
    }

    seen.add(fileName);
    normalized.push(fileName);
  });

  return normalized.length > 0 ? normalized : [...DEFAULT_REGULASI_ORDER];
}

function serializeRegulasiOrder(order: string[]): string {
  return JSON.stringify(order.map((slug) => String(slug || "").trim()).filter(Boolean));
}

function normalizeSoftstructureOrder(rawValue: unknown): string[] {
  const rawList = Array.isArray(rawValue)
    ? rawValue
    : (() => {
        try {
          const parsed = JSON.parse(String(rawValue ?? ""));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  const seen = new Set<string>();
  const normalized: string[] = [];

  rawList.forEach((item) => {
    const fileName = String(item ?? "").trim();
    if (!fileName || seen.has(fileName)) {
      return;
    }

    seen.add(fileName);
    normalized.push(fileName);
  });

  return normalized.length > 0 ? normalized : [...DEFAULT_SOFTSTRUCTURE_ORDER];
}

function serializeSoftstructureOrder(order: string[]): string {
  return JSON.stringify(order.map((fileName) => String(fileName || "").trim()).filter(Boolean));
}

function normalizeKajianOrder(rawValue: unknown): string[] {
  const rawList = Array.isArray(rawValue)
    ? rawValue
    : (() => {
        try {
          const parsed = JSON.parse(String(rawValue ?? ""));
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      })();

  const seen = new Set<string>();
  const normalized: string[] = [];

  rawList.forEach((item) => {
    const fileName = String(item ?? "").trim();
    if (!fileName || seen.has(fileName)) {
      return;
    }

    seen.add(fileName);
    normalized.push(fileName);
  });

  return normalized.length > 0 ? normalized : [...DEFAULT_KAJIAN_ORDER];
}

function serializeKajianOrder(order: string[]): string {
  return JSON.stringify(order.map((fileName) => String(fileName || "").trim()).filter(Boolean));
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
      const value = Number((item as { value?: unknown }).value ?? Number.NaN);
      if (!year || Number.isNaN(value)) {
        return null;
      }

      return { year, value };
    })
    .filter((item): item is GcgScore => item !== null);

  return rows.length > 0 ? rows : DEFAULT_GCG_SCORES;
}

function parseDashboardMeta(rawValue: unknown): DashboardMeta {
  try {
    const parsed = JSON.parse(String(rawValue ?? ""));

    if (Array.isArray(parsed)) {
      return {
        gcgScores: normalizeGcgScores(parsed),
        riskProfileSourceName: "",
      };
    }

    if (parsed && typeof parsed === "object") {
      const obj = parsed as {
        gcgScores?: unknown;
        riskProfileSourceName?: unknown;
      };

      return {
        gcgScores: normalizeGcgScores(obj.gcgScores),
        riskProfileSourceName: String(obj.riskProfileSourceName ?? "").trim(),
      };
    }
  } catch {
    // Backward compatibility with malformed legacy value.
  }

  return { ...DEFAULT_DASHBOARD_META };
}

function serializeDashboardMeta(meta: DashboardMeta): string {
  return JSON.stringify({
    gcgScores: normalizeGcgScores(meta.gcgScores),
    riskProfileSourceName: String(meta.riskProfileSourceName || "").trim(),
  });
}

async function ensureDashboardSettingsRow() {
  await prisma.dashboardSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      dashboardTitle: DEFAULT_SETTINGS.dashboardTitle,
      dashboardSubtitle: DEFAULT_SETTINGS.dashboardSubtitle,
      kajian2025: DEFAULT_SETTINGS.kajian2025,
      kajian2024: DEFAULT_SETTINGS.kajian2024,
      isoNote: DEFAULT_SETTINGS.isoNote,
      penghargaanNote: DEFAULT_SETTINGS.penghargaanNote,
      penghargaanUrl: DEFAULT_SETTINGS.penghargaanUrl,
      regulasiOrder: DEFAULT_SETTINGS.regulasiOrder,
      softstructureOrder: DEFAULT_SETTINGS.softstructureOrder,
      kajianOrder: DEFAULT_SETTINGS.kajianOrder,
      gcgScoresJson: DEFAULT_SETTINGS.gcgScoresJson,
    },
  });

  const current = await prisma.dashboardSettings.findUnique({ where: { id: 1 } });
  if (!current) {
    return;
  }

  const patch: Partial<DashboardSettingsRecord> = {};

  if (!current.isoNote || current.isoNote === LEGACY_ISO_NOTE) {
    patch.isoNote = DEFAULT_SETTINGS.isoNote;
  }

  if (current.penghargaanNote === LEGACY_PENGHARGAAN_NOTE || current.penghargaanNote === LEGACY_SEEDED_PENGHARGAAN_NOTE) {
    patch.penghargaanNote = DEFAULT_SETTINGS.penghargaanNote;
  }

  if (!current.penghargaanUrl || current.penghargaanUrl === LEGACY_SEEDED_PENGHARGAAN_URL) {
    patch.penghargaanUrl = DEFAULT_SETTINGS.penghargaanUrl;
  }

  if (!current.regulasiOrder) {
    patch.regulasiOrder = DEFAULT_SETTINGS.regulasiOrder;
  }

  if (!current.softstructureOrder) {
    patch.softstructureOrder = DEFAULT_SETTINGS.softstructureOrder;
  }

  if (!current.kajianOrder) {
    patch.kajianOrder = DEFAULT_SETTINGS.kajianOrder;
  }

  if (Object.keys(patch).length > 0) {
    await prisma.dashboardSettings.update({
      where: { id: 1 },
      data: patch,
    });
  }
}

async function getSettingsRow(): Promise<DashboardSettingsRecord> {
  await ensureDashboardSettingsRow();

  const row = await prisma.dashboardSettings.findUnique({ where: { id: 1 } });
  if (!row) {
    return DEFAULT_SETTINGS;
  }

  return {
    dashboardTitle: row.dashboardTitle,
    dashboardSubtitle: row.dashboardSubtitle,
    kajian2025: row.kajian2025,
    kajian2024: row.kajian2024,
    isoNote: row.isoNote,
    penghargaanNote: row.penghargaanNote,
    penghargaanUrl: row.penghargaanUrl,
    regulasiOrder: row.regulasiOrder,
    softstructureOrder: row.softstructureOrder,
    kajianOrder: row.kajianOrder,
    gcgScoresJson: row.gcgScoresJson,
  };
}

export async function GET() {
  try {
    const row = await getSettingsRow();
    const parsedMeta = parseDashboardMeta(row.gcgScoresJson);
    const parsedScores = parsedMeta.gcgScores;
    const penghargaanUrls = parsePenghargaanUrls(row.penghargaanUrl);
    const regulasiOrder = normalizeRegulasiOrder(row.regulasiOrder);
    const softstructureOrder = normalizeSoftstructureOrder(row.softstructureOrder);
    const kajianOrder = normalizeKajianOrder(row.kajianOrder);
    const dashboardTitle = row.dashboardTitle === "Improvement Dashboard GCG"
      ? "DASHBOARD GCG"
      : row.dashboardTitle;

    return NextResponse.json({
      dashboardTitle,
      dashboardSubtitle: row.dashboardSubtitle,
      kajian2025: row.kajian2025,
      kajian2024: row.kajian2024,
      isoNote: row.isoNote,
      penghargaanNote: row.penghargaanNote,
      penghargaanUrl: penghargaanUrls.find((url) => Boolean(url)) || "",
      penghargaanUrls,
      regulasiOrder,
      softstructureOrder,
      kajianOrder,
      gcgScores: parsedScores,
      riskProfileSourceName: parsedMeta.riskProfileSourceName,
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

    if (!isVipRole(session.user.role)) {
      return NextResponse.json({ error: "Terlarang. Hanya Admin/VIP yang dapat mengubah dashboard." }, { status: 403 });
    }

    const body = await req.json();

    const dashboardTitle = String(body.dashboardTitle ?? DEFAULT_SETTINGS.dashboardTitle).trim() || DEFAULT_SETTINGS.dashboardTitle;
    const dashboardSubtitle = String(body.dashboardSubtitle ?? DEFAULT_SETTINGS.dashboardSubtitle).trim() || DEFAULT_SETTINGS.dashboardSubtitle;
    const kajian2025 = String(body.kajian2025 ?? DEFAULT_SETTINGS.kajian2025).trim() || DEFAULT_SETTINGS.kajian2025;
    const kajian2024 = String(body.kajian2024 ?? DEFAULT_SETTINGS.kajian2024).trim() || DEFAULT_SETTINGS.kajian2024;
    const isoNote = String(body.isoNote ?? DEFAULT_SETTINGS.isoNote).trim() || DEFAULT_SETTINGS.isoNote;
    const penghargaanNote = String(body.penghargaanNote ?? "").trim();
    const rawPenghargaanUrlList: unknown[] = Array.isArray(body.penghargaanUrls)
      ? body.penghargaanUrls
      : [body.penghargaanUrl ?? ""];

    const existingRow = await getSettingsRow();
    const existingPenghargaanUrls = parsePenghargaanUrls(existingRow.penghargaanUrl);
    const existingRegulasiOrder = normalizeRegulasiOrder(existingRow.regulasiOrder);
    const existingSoftstructureOrder = normalizeSoftstructureOrder(existingRow.softstructureOrder);
    const existingKajianOrder = normalizeKajianOrder(existingRow.kajianOrder);

    let invalidPenghargaanUrlIndex = -1;

    let penghargaanUrls = rawPenghargaanUrlList.map((rawValue, index) => {
      const raw = String(rawValue ?? "").trim();
      if (!raw) return "";

      const normalized = normalizeExternalUrl(raw);
      if (!normalized) {
        invalidPenghargaanUrlIndex = index;
        return "";
      }
      return normalized;
    });

    if (invalidPenghargaanUrlIndex >= 0) {
      return NextResponse.json(
        { error: `URL penghargaan ke-${invalidPenghargaanUrlIndex + 1} tidak valid` },
        { status: 400 }
      );
    }

    if (penghargaanUrls.length < existingPenghargaanUrls.length) {
      const merged = [...penghargaanUrls];
      for (let index = merged.length; index < existingPenghargaanUrls.length; index += 1) {
        merged[index] = existingPenghargaanUrls[index] || "";
      }
      penghargaanUrls = merged;
    }

    while (penghargaanUrls.length > 0 && !penghargaanUrls[penghargaanUrls.length - 1]) {
      penghargaanUrls.pop();
    }

    const regulasiOrder = body.regulasiOrder === undefined
      ? existingRegulasiOrder
      : normalizeRegulasiOrder(body.regulasiOrder);
    const softstructureOrder = body.softstructureOrder === undefined
      ? existingSoftstructureOrder
      : normalizeSoftstructureOrder(body.softstructureOrder);
    const kajianOrder = body.kajianOrder === undefined
      ? existingKajianOrder
      : normalizeKajianOrder(body.kajianOrder);

    const serializedPenghargaanUrls = serializePenghargaanUrls(penghargaanUrls);
    const serializedRegulasiOrder = serializeRegulasiOrder(regulasiOrder);
    const serializedSoftstructureOrder = serializeSoftstructureOrder(softstructureOrder);
    const serializedKajianOrder = serializeKajianOrder(kajianOrder);
    const existingMeta = parseDashboardMeta(existingRow.gcgScoresJson);
    const gcgScores = body.gcgScores === undefined
      ? existingMeta.gcgScores
      : normalizeGcgScores(body.gcgScores);
    const riskProfileSourceName = body.riskProfileSourceName === undefined
      ? existingMeta.riskProfileSourceName
      : String(body.riskProfileSourceName ?? "").trim();

    await ensureDashboardSettingsRow();
    await prisma.dashboardSettings.update({
      where: { id: 1 },
      data: {
        dashboardTitle,
        dashboardSubtitle,
        kajian2025,
        kajian2024,
        isoNote,
        penghargaanNote,
        penghargaanUrl: serializedPenghargaanUrls,
        regulasiOrder: serializedRegulasiOrder,
        softstructureOrder: serializedSoftstructureOrder,
        kajianOrder: serializedKajianOrder,
        gcgScoresJson: serializeDashboardMeta({
          gcgScores,
          riskProfileSourceName,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update dashboard settings", error);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan dashboard" }, { status: 500 });
  }
}
