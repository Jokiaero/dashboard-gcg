const PELAPORAN_CATEGORY_LIST = [
    "pelaporan_wbs",
    "pelaporan_risiko",
    "pelaporan_penyuapan",
    "pelaporan_ppg",
    "pelaporan_survey",
] as const;

export type PelaporanCategory = (typeof PELAPORAN_CATEGORY_LIST)[number];

export const PELAPORAN_ROUTE_MAP: Record<PelaporanCategory, string> = {
    pelaporan_wbs: "/laporan-wbs",
    pelaporan_risiko: "/laporan-risiko-keuangan",
    pelaporan_penyuapan: "/laporan-monitoring-risiko-penyuapan",
    pelaporan_ppg: "/laporan-implementasi-ppg-kpk",
    pelaporan_survey: "/laporan-survey-awareness-gcg",
};

const MONITORING_KEYWORDS = [
    "monitoring",
    "risk register",
    "risk-register",
    "register risiko",
    "pemantauan risiko",
];

const PPG_KEYWORDS = [
    "ppg",
    "gratifikasi",
    "implementasi ppg",
    "kpk",
];

const SURVEY_KEYWORDS = [
    "survey",
    "awareness",
];

const RISIKO_KEYWORDS = [
    "profil risiko",
    "risk profile",
    "risk-profile",
    "template profil risiko",
    "risiko",
];

const WBS_KEYWORDS = [
    "wbs",
    "whistleblowing",
    "whistle blowing",
    "pelaporan pelanggaran",
    "pengaduan",
];

function normalizeMarker(value: string): string {
    return value
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function hasAnyKeyword(marker: string, keywords: string[]): boolean {
    return keywords.some((keyword) => marker.includes(keyword));
}

export function isPelaporanCategory(category: string): category is PelaporanCategory {
    return PELAPORAN_CATEGORY_LIST.includes(category as PelaporanCategory);
}

export function inferPelaporanCategoryFromName(name: string, originalName?: string | null): PelaporanCategory | null {
    const marker = normalizeMarker(`${name || ""} ${originalName || ""}`);
    if (!marker) {
        return null;
    }

    if (hasAnyKeyword(marker, MONITORING_KEYWORDS)) {
        return "pelaporan_penyuapan";
    }

    if (hasAnyKeyword(marker, PPG_KEYWORDS)) {
        return "pelaporan_ppg";
    }

    if (hasAnyKeyword(marker, SURVEY_KEYWORDS)) {
        return "pelaporan_survey";
    }

    if (hasAnyKeyword(marker, RISIKO_KEYWORDS)) {
        return "pelaporan_risiko";
    }

    if (hasAnyKeyword(marker, WBS_KEYWORDS)) {
        return "pelaporan_wbs";
    }

    return null;
}
