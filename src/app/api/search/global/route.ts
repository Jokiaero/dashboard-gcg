import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sessionOptions, SessionData } from "@/lib/session";
import { REGULASI_DOCS_BY_SLUG } from "@/lib/regulasiDocuments";
import { ASSESSMENT_DOCS_BY_SLUG } from "@/lib/assessmentDocuments";
import { ensureDocumentStoreTable } from "@/lib/documentStore";
import { isAdminRole, isVipRole, normalizeAppRole } from "@/lib/roles";

type SearchResultType = "menu" | "regulasi" | "assessment" | "dokumen" | "laporan";
type AccessScope = "all" | "vip" | "admin";

type SearchResultItem = {
    id: string;
    type: SearchResultType;
    title: string;
    description: string;
    href: string;
    iconClass: string;
    iconColor: string;
};

type MenuSearchItem = {
    id: string;
    title: string;
    description: string;
    href: string;
    keywords: string[];
    iconClass: string;
    iconColor: string;
    access: AccessScope;
};

const MENU_SEARCH_ITEMS: MenuSearchItem[] = [
    {
        id: "menu-dashboard",
        title: "Dashboard",
        description: "Ringkasan performa dan statistik GCG",
        href: "/",
        keywords: ["dashboard", "ringkasan", "statistik", "gcg"],
        iconClass: "icon-grid",
        iconColor: "bg-slate-100 text-slate-700",
        access: "all",
    },
    {
        id: "menu-regulasi",
        title: "Katalog Regulasi",
        description: "Daftar dokumen regulasi Kementerian BUMN",
        href: "/regulasi",
        keywords: ["regulasi", "peraturan", "menteri", "bumn"],
        iconClass: "icon-book",
        iconColor: "bg-blue-50 text-blue-600",
        access: "all",
    },
    {
        id: "menu-softstructure-gcg",
        title: "Katalog Softstructure GCG",
        description: "Kumpulan dokumen softstructure GCG internal",
        href: "/softstructure",
        keywords: ["softstructure", "pedoman", "gcg"],
        iconClass: "icon-layout",
        iconColor: "bg-emerald-50 text-emerald-600",
        access: "all",
    },
    {
        id: "menu-laporan-wbs",
        title: "Laporan WBS",
        description: "Laporan Whistleblowing System",
        href: "/laporan-wbs",
        keywords: ["laporan", "wbs", "pelaporan"],
        iconClass: "icon-pie-graph",
        iconColor: "bg-blue-50 text-blue-600",
        access: "vip",
    },
    {
        id: "menu-laporan-risiko",
        title: "Laporan Profil Risiko Anti Penyuapan",
        description: "Profil risiko keuangan dan kepatuhan anti penyuapan",
        href: "/laporan-risiko-keuangan",
        keywords: ["laporan", "risiko", "penyuapan"],
        iconClass: "icon-shield",
        iconColor: "bg-amber-50 text-amber-600",
        access: "vip",
    },
    {
        id: "menu-laporan-monitoring",
        title: "Laporan Monitoring Risiko Penyuapan",
        description: "Pemantauan tren risiko dan tindak lanjut mitigasi",
        href: "/laporan-monitoring-risiko-penyuapan",
        keywords: ["laporan", "monitoring", "risiko", "penyuapan"],
        iconClass: "icon-bar-graph",
        iconColor: "bg-orange-50 text-orange-600",
        access: "vip",
    },
    {
        id: "menu-laporan-ppg",
        title: "Laporan Hasil Implementasi PPG ke KPK",
        description: "Ringkasan progres implementasi program pelaporan gratifikasi",
        href: "/laporan-implementasi-ppg-kpk",
        keywords: ["laporan", "ppg", "kpk", "gratifikasi"],
        iconClass: "icon-paper",
        iconColor: "bg-emerald-50 text-emerald-600",
        access: "vip",
    },
    {
        id: "menu-laporan-survey",
        title: "Laporan Survey Awareness GCG",
        description: "Hasil survey awareness dan evaluasi budaya kepatuhan",
        href: "/laporan-survey-awareness-gcg",
        keywords: ["laporan", "survey", "awareness", "gcg"],
        iconClass: "icon-check",
        iconColor: "bg-indigo-50 text-indigo-600",
        access: "vip",
    },
    {
        id: "menu-kajian",
        title: "Kajian Internal GCG",
        description: "Dokumen kajian dan pengetahuan internal",
        href: "/kajian-internal",
        keywords: ["kajian", "internal", "pengetahuan", "gcg"],
        iconClass: "icon-search",
        iconColor: "bg-cyan-50 text-cyan-600",
        access: "all",
    },
    {
        id: "menu-approval-kepatuhan",
        title: "Approval Pernyataan Kepatuhan",
        description: "Statistik approval pernyataan kepatuhan",
        href: "/approval-pernyataan-kepatuhan",
        keywords: ["approval", "kepatuhan", "pernyataan"],
        iconClass: "icon-check",
        iconColor: "bg-teal-50 text-teal-600",
        access: "vip",
    },
    {
        id: "menu-assessment-gcg",
        title: "Assessment GCG",
        description: "Penilaian tata kelola perusahaan",
        href: "/assessment-gcg",
        keywords: ["assessment", "gcg", "penilaian"],
        iconClass: "icon-bar-graph",
        iconColor: "bg-violet-50 text-violet-600",
        access: "vip",
    },
    {
        id: "menu-sertifikasi-iso",
        title: "Sertifikasi ISO 37001",
        description: "Sertifikat Sistem Manajemen Anti Penyuapan",
        href: "/assessment/sertifikasi-iso-37001",
        keywords: ["assessment", "sertifikasi", "iso", "37001"],
        iconClass: "icon-bar-graph",
        iconColor: "bg-violet-50 text-violet-600",
        access: "vip",
    },
    {
        id: "menu-berita-gcg",
        title: "Berita GCG",
        description: "Katalog berita dan dokumentasi GCG",
        href: "/berita-gcg",
        keywords: ["berita", "penghargaan", "award", "gcg"],
        iconClass: "icon-head",
        iconColor: "bg-yellow-50 text-yellow-700",
        access: "all",
    },
    {
        id: "menu-admin",
        title: "Panel Admin",
        description: "Manajemen konten dan pengguna",
        href: "/admin",
        keywords: ["admin", "manajemen", "pengguna"],
        iconClass: "icon-settings",
        iconColor: "bg-slate-100 text-slate-800",
        access: "admin",
    },
];

const CATEGORY_ROUTE_MAP: Record<string, string> = {
    regulasi: "/regulasi",
    softstructure: "/softstructure",
    assessment: "/assessment/sertifikasi-iso-37001",
    kajian: "/kajian-internal",
    penghargaan: "/berita-gcg",
    documents: "/admin",
    pelaporan_wbs: "/laporan-wbs",
    pelaporan_risiko: "/laporan-risiko-keuangan",
    pelaporan_penyuapan: "/laporan-monitoring-risiko-penyuapan",
    pelaporan_ppg: "/laporan-implementasi-ppg-kpk",
    pelaporan_survey: "/laporan-survey-awareness-gcg",
    approval_kepatuhan: "/approval-pernyataan-kepatuhan",
};

const PELAPORAN_CATEGORIES = new Set([
    "pelaporan_wbs",
    "pelaporan_risiko",
    "pelaporan_penyuapan",
    "pelaporan_ppg",
    "pelaporan_survey",
]);

const RESTRICTED_USER_CATEGORIES = new Set([
    "assessment",
    "approval_kepatuhan",
]);

function canAccess(scope: AccessScope, role: string) {
    const normalizedRole = normalizeAppRole(role);
    if (scope === "all") return true;
    if (scope === "admin") return isAdminRole(normalizedRole);
    return isVipRole(normalizedRole);
}

function isMatch(parts: Array<string | undefined | null>, query: string) {
    return parts.some((value) => (value || "").toLowerCase().includes(query));
}

function formatDocumentCategory(category: string) {
    return category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

async function resolveRole() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    return normalizeAppRole(session.user?.role);
}

function canAccessPelaporan(role: string) {
    return isVipRole(role);
}

function canAccessDocumentCategory(category: string, role: string) {
    const normalizedRole = normalizeAppRole(role);

    if (normalizedRole === "ADMIN") {
        return true;
    }

    if (normalizedRole === "USER_VIP") {
        return category !== "documents";
    }

    if (normalizedRole === "USER") {
        if (category === "documents") return false;
        if (PELAPORAN_CATEGORIES.has(category)) return false;
        if (RESTRICTED_USER_CATEGORIES.has(category)) return false;
        return true;
    }

    return category === "regulasi";
}

async function findDocumentResults(rawQuery: string, role: string, take: number): Promise<SearchResultItem[]> {
    try {
        await ensureDocumentStoreTable();
        const docRows = await prisma.uploadedDocument.findMany({
            where: {
                isDeleted: false,
                OR: [
                    { name: { contains: rawQuery, mode: "insensitive" } },
                    { originalName: { contains: rawQuery, mode: "insensitive" } },
                    { category: { contains: rawQuery, mode: "insensitive" } },
                ],
            },
            orderBy: { updatedAt: "desc" },
            take,
            select: {
                id: true,
                category: true,
                name: true,
                originalName: true,
                url: true,
            },
        });

        return docRows
            .filter((row) => canAccessDocumentCategory(row.category, role))
            .map((row) => ({
                id: `dokumen-${row.id.toString()}`,
                type: "dokumen",
                title: row.originalName || row.name,
                description: `Dokumen ${formatDocumentCategory(row.category)}`,
                href: CATEGORY_ROUTE_MAP[row.category] || "/",
                iconClass: "icon-paper",
                iconColor: "bg-cyan-50 text-cyan-700",
            }));
    } catch {
        return [];
    }
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const rawQuery = (searchParams.get("q") || "").trim();
        const query = rawQuery.toLowerCase();
        const requestedLimit = Number(searchParams.get("limit") || "12");
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(Math.max(Math.floor(requestedLimit), 1), 24)
            : 12;

        if (!query) {
            return NextResponse.json({ query: rawQuery, results: [] });
        }

        if (query.length < 1) {
            return NextResponse.json({ query: rawQuery, results: [], minChars: 1 });
        }

        const role = await resolveRole();

        const menuResults: SearchResultItem[] = MENU_SEARCH_ITEMS
            .filter((item) => canAccess(item.access, role))
            .filter((item) => isMatch([item.title, item.description, ...item.keywords], query))
            .map((item) => ({
                id: item.id,
                type: "menu",
                title: item.title,
                description: item.description,
                href: item.href,
                iconClass: item.iconClass,
                iconColor: item.iconColor,
            }));

        const regulasiResults: SearchResultItem[] = Object.entries(REGULASI_DOCS_BY_SLUG)
            .filter(([slug, doc]) => isMatch([slug, doc.title, doc.subtitle], query))
            .map(([slug, doc]) => ({
                id: `regulasi-${slug}`,
                type: "regulasi",
                title: doc.title,
                description: doc.subtitle,
                href: `/regulasi/${slug}`,
                iconClass: "icon-book",
                iconColor: "bg-blue-50 text-blue-600",
            }));

        const assessmentResults: SearchResultItem[] = canAccess("vip", role)
            ? Object.entries(ASSESSMENT_DOCS_BY_SLUG)
                .filter(([slug, doc]) => isMatch([slug, doc.title, doc.subtitle], query))
                .map(([slug, doc]) => ({
                    id: `assessment-${slug}`,
                    type: "assessment",
                    title: doc.title,
                    description: doc.subtitle,
                    href: `/assessment/${slug}`,
                    iconClass: "icon-bar-graph",
                    iconColor: "bg-violet-50 text-violet-600",
                }))
            : [];

        // Untuk query pendek, prioritaskan hasil modul supaya respons terasa cepat.
        const fastLocalDeduped = new Map<string, SearchResultItem>();
        [...menuResults, ...regulasiResults, ...assessmentResults].forEach((item) => {
            const key = `${item.href}::${item.title.toLowerCase()}`;
            if (!fastLocalDeduped.has(key)) {
                fastLocalDeduped.set(key, item);
            }
        });
        const fastLocalResults = Array.from(fastLocalDeduped.values()).slice(0, limit);
        if (query.length <= 3 && fastLocalResults.length > 0) {
            return NextResponse.json({
                query: rawQuery,
                results: fastLocalResults,
                counts: {
                    menu: menuResults.length,
                    regulasi: regulasiResults.length,
                    assessment: assessmentResults.length,
                    dokumen: 0,
                    laporan: 0,
                },
            });
        }

        const heavyLookupTake = query.length <= 5 ? 6 : 8;

        const [laporanRows, documentResults] = await Promise.all([
            canAccessPelaporan(role)
                ? prisma.dataLaporan.findMany({
                    where: {
                        OR: [
                            { nama: { contains: rawQuery } },
                            { nik: { contains: rawQuery } },
                            { jabatan: { contains: rawQuery } },
                            { department: { contains: rawQuery } },
                            { direktorat: { contains: rawQuery } },
                            { tahun: { contains: rawQuery } },
                            { status_approved: { contains: rawQuery } },
                        ],
                    },
                    orderBy: { id: "desc" },
                    take: heavyLookupTake,
                    select: {
                        id: true,
                        nama: true,
                        nik: true,
                        jabatan: true,
                        department: true,
                        tahun: true,
                    },
                })
                : Promise.resolve([]),
            findDocumentResults(rawQuery, role, heavyLookupTake),
        ]);

        const laporanResults: SearchResultItem[] = laporanRows.map((row) => ({
            id: `laporan-${row.id}`,
            type: "laporan",
            title: row.nama || row.nik || `Data Laporan #${row.id}`,
            description: [row.nik, row.jabatan, row.department, row.tahun].filter(Boolean).join(" • ") || "Data laporan GCG",
            href: `/laporan-wbs?search=${encodeURIComponent(rawQuery)}`,
            iconClass: "icon-paper",
            iconColor: "bg-emerald-50 text-emerald-600",
        }));

        const deduped = new Map<string, SearchResultItem>();
        [...menuResults, ...regulasiResults, ...assessmentResults, ...documentResults, ...laporanResults]
            .forEach((item) => {
                const key = `${item.href}::${item.title.toLowerCase()}`;
                if (!deduped.has(key)) {
                    deduped.set(key, item);
                }
            });

        const results = Array.from(deduped.values()).slice(0, limit);

        return NextResponse.json({
            query: rawQuery,
            results,
            counts: {
                menu: menuResults.length,
                regulasi: regulasiResults.length,
                assessment: assessmentResults.length,
                dokumen: documentResults.length,
                laporan: laporanResults.length,
            },
        });
    } catch (error) {
        console.error("Failed to execute global search", error);
        return NextResponse.json({ error: "Failed to execute global search" }, { status: 500 });
    }
}