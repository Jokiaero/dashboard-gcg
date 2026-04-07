"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ISO_37001_ASSESSMENT_ROUTE, ISO_37001_PDF_PATH } from "@/lib/assessmentDocuments";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type WbsResponse = {
    data: Array<{ tahun: string; laporanWbs: number; ditindaklanjuti: number }>;
};

type DashboardSettingsResponse = {
    dashboardTitle: string;
    dashboardSubtitle: string;
    kajian2025: string;
    kajian2024: string;
    isoNote: string;
    penghargaanNote: string;
    gcgScores: Array<{ year: string; value: number }>;
};

type ApprovalKepatuhanResponse = {
    currentYear: number;
    currentValue: number;
    previousYear: number;
    previousValue: number;
    average: number;
    hasData: boolean;
};

type UserSessionResponse = {
    role: string;
};

// ─── Static Data ─────────────────────────────────────────────────────────────

const defaultIndikatorData = [
    { year: "2020", value: 92.47 },
    { year: "2021", value: 93.85 },
    { year: "2022", value: 94.9 },
    { year: "2023", value: 88.51 },
    { year: "2024", value: 92.84 },
];

const laporanItems = [
    {
        title: "Laporan WBS",
        category: "Pelaporan Proyek",
        period: "2021–2025",
        status: "Aktif",
        href: "/laporan-wbs",
        icon: "icon-pie-graph",
        color: "#2b4c3d",
        bg: "#e8f3ee",
    },
    {
        title: "Profil Risiko Anti Penyuapan",
        category: "Risk & Compliance",
        period: "Tahunan",
        status: "Kosong",
        href: "/laporan-risiko-keuangan",
        icon: "icon-shield",
        color: "#b45309",
        bg: "#fef3c7",
    },
    {
        title: "Monitoring Risiko Penyuapan",
        category: "Risk Monitoring",
        period: "Triwulanan",
        status: "Kosong",
        href: "/laporan-monitoring-risiko-penyuapan",
        icon: "icon-bar-graph",
        color: "#c2410c",
        bg: "#ffedd5",
    },
    {
        title: "Implementasi PPG ke KPK",
        category: "Implementasi Program",
        period: "Semester",
        status: "Kosong",
        href: "/laporan-implementasi-ppg-kpk",
        icon: "icon-paper",
        color: "#065f46",
        bg: "#d1fae5",
    },
    {
        title: "Survey Awareness GCG",
        category: "Survey Internal",
        period: "Tahunan",
        status: "Kosong",
        href: "/laporan-survey-awareness-gcg",
        icon: "icon-check",
        color: "#3730a3",
        bg: "#e0e7ff",
    },
    {
        title: "Approval Pernyataan Kepatuhan",
        category: "Kepatuhan",
        period: "Tahunan",
        status: "Aktif",
        href: "/approval-pernyataan-kepatuhan",
        icon: "icon-check",
        color: "#0f766e",
        bg: "#ccfbf1",
    },
];

const USER_HIDDEN_DASHBOARD_PATHS = new Set([
    "/approval-pernyataan-kepatuhan",
]);

const agendaItems = [
    {
        label: "Assessment GCG Internal",
        date: "Q1 2025",
        status: "done",
        desc: "Penilaian internal tata kelola perusahaan",
    },
    {
        label: "Pengiriman Laporan PPG ke KPK",
        date: "Feb 2025",
        status: "done",
        desc: "Laporan program pengendalian gratifikasi",
    },
    {
        label: "Survey Awareness GCG",
        date: "Q2 2025",
        status: "ongoing",
        desc: "Survey budaya kepatuhan kepada seluruh karyawan",
    },
    {
        label: "Review Dokumen ISO 37001",
        date: "Agu 2025",
        status: "upcoming",
        desc: "Peninjauan berkala dokumen SMAP",
    },
    {
        label: "Audit Eksternal ISO 37001",
        date: "Nov 2025",
        status: "upcoming",
        desc: "Surveillance audit oleh lembaga sertifikasi",
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function GaugeSemiCircle({ value }: { value: number }) {
    const radius = 56;
    const stroke = 12;
    const normalized = Math.max(0, Math.min(100, value));
    const circumference = Math.PI * radius;
    const progress = (normalized / 100) * circumference;
    const color = normalized >= 80 ? "#2b4c3d" : normalized >= 60 ? "#f59e0b" : "#ef4444";

    return (
        <svg width="160" height="90" viewBox="0 0 160 90" role="img" aria-label={`Skor ${normalized.toFixed(1)}`}>
            <path d="M 20 80 A 60 60 0 0 1 140 80" stroke="#e2e8f0" strokeWidth={stroke} fill="none" strokeLinecap="round" />
            <path
                d="M 20 80 A 60 60 0 0 1 140 80"
                stroke={color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`}
            />
            <text x="80" y="58" textAnchor="middle" fill="#1f2937" fontSize="22" fontWeight="700">
                {normalized.toFixed(1)}%
            </text>
            <text x="80" y="76" textAnchor="middle" fill="#64748b" fontSize="11">
                Tindak Lanjut
            </text>
        </svg>
    );
}

function KpiCard({
    icon,
    iconBg,
    iconColor,
    label,
    value,
    sub,
    badge,
    badgeColor,
    href,
}: {
    icon: string;
    iconBg: string;
    iconColor: string;
    label: string;
    value: string;
    sub?: string;
    badge?: string;
    badgeColor?: string;
    href?: string;
}) {
    return (
        <div className="card h-100 shadow-sm" style={{ borderRadius: 8, borderLeft: `4px solid ${iconColor}` }}>
            <div className="card-body d-flex align-items-center gap-3 p-3">
                <div
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 10,
                        backgroundColor: iconBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <i className={icon} style={{ color: iconColor, fontSize: 20 }}></i>
                </div>
                <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                        {label}
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1e293b", lineHeight: 1.2 }}>{value}</div>
                    {sub && <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{sub}</div>}
                </div>
                {badge && (
                    <span
                        className="badge"
                        style={{
                            backgroundColor: badgeColor || "#2b4c3d",
                            color: "#fff",
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 6,
                            flexShrink: 0,
                        }}
                    >
                        {badge}
                    </span>
                )}
            </div>
            {href && (
                <div style={{ borderTop: "1px solid #f1f5f9", padding: "6px 12px" }}>
                    <Link href={href} style={{ fontSize: 11, color: iconColor, fontWeight: 600, textDecoration: "none" }}>
                        Lihat Detail →
                    </Link>
                </div>
            )}
        </div>
    );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "#64748b",
                borderBottom: "2px solid #2b4c3d",
                paddingBottom: 6,
                marginBottom: 14,
                display: "inline-block",
            }}
        >
            {children}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardCharts() {
    const { data: userSession } = useQuery<UserSessionResponse>({
        queryKey: ["userSession"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me");
            if (!res.ok) return { role: "USER" };
            return res.json();
        },
        staleTime: 60_000,
    });

    const { data: wbsData, isLoading: isWbsLoading } = useQuery<WbsResponse>({
        queryKey: ["dashboardWbsMini"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/wbs");
            if (!res.ok) throw new Error("Gagal memuat data WBS");
            return res.json();
        },
    });

    const { data: dashboardSettings } = useQuery<DashboardSettingsResponse>({
        queryKey: ["dashboardSettings"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/settings");
            if (!res.ok) throw new Error("Gagal memuat pengaturan dashboard");
            return res.json();
        },
    });

    const { data: approvalStats } = useQuery<ApprovalKepatuhanResponse>({
        queryKey: ["dashboardApprovalKepatuhan"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/approval-kepatuhan");
            if (!res.ok) throw new Error("Gagal memuat data approval kepatuhan");
            return res.json();
        },
    });

    // ── Derived data ──────────────────────────────────────────────────────────
    const indikatorData = dashboardSettings?.gcgScores?.length
        ? dashboardSettings.gcgScores
        : defaultIndikatorData;

    const latestGcg = indikatorData[indikatorData.length - 1];
    const previousGcg = indikatorData[indikatorData.length - 2];
    const gcgDelta = latestGcg.value - previousGcg.value;

    const wbsChart = (wbsData?.data || []).map((item) => ({
        tahun: item.tahun,
        laporan: Number(item.laporanWbs || 0),
        tindak: Number(item.ditindaklanjuti || 0),
    }));
    const selectedYears = wbsChart.slice(-4);
    const totalLaporan = wbsChart.reduce((sum, item) => sum + item.laporan, 0);
    const totalTindak = wbsChart.reduce((sum, item) => sum + item.tindak, 0);
    const wbsScore = totalLaporan > 0 ? (totalTindak / totalLaporan) * 100 : 0;

    const approvalCurrentText = `${((approvalStats?.currentValue ?? 0) * 100).toFixed(2)}%`;
    const approvalPreviousText = `${((approvalStats?.previousValue ?? 0) * 100).toFixed(2)}%`;
    const approvalAverageText = `${((approvalStats?.average ?? 0) * 100).toFixed(2)}%`;
    const isBasicUser = userSession?.role === "USER";
    const visibleLaporanItems = isBasicUser
        ? laporanItems.filter((item) => !item.href.startsWith("/laporan-") && !USER_HIDDEN_DASHBOARD_PATHS.has(item.href))
        : laporanItems;
    const penghargaanLines = (dashboardSettings?.penghargaanNote || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const renderPenghargaanLines = penghargaanLines;
    const dashboardHeaderTitle = !dashboardSettings?.dashboardTitle || dashboardSettings.dashboardTitle === "Improvement Dashboard GCG"
        ? "DASHBOARD GCG"
        : dashboardSettings.dashboardTitle;

    // ── Status badge helper ───────────────────────────────────────────────────
    const statusBadge = (status: string) => {
        if (status === "Aktif")
            return { bg: "#dcfce7", color: "#166534", label: "Aktif" };
        if (status === "Draft")
            return { bg: "#fef9c3", color: "#854d0e", label: "Draft" };
        return { bg: "#f1f5f9", color: "#64748b", label: "Kosong" };
    };

    const agendaStyle = (status: string) => {
        if (status === "done") return { dot: "#2b4c3d", icon: "✓", opacity: 0.7 };
        if (status === "ongoing") return { dot: "#f59e0b", icon: "↻", opacity: 1 };
        return { dot: "#94a3b8", icon: "○", opacity: 1 };
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div
                className="d-flex align-items-center justify-content-between flex-wrap gap-2"
                style={{
                    background: "linear-gradient(135deg, #1a3a2a 0%, #2b4c3d 60%, #3d6b54 100%)",
                    borderRadius: 10,
                    padding: "18px 24px",
                    boxShadow: "0 4px 15px rgba(43, 76, 61, 0.25)",
                }}
            >
                <div>
                    <h4 className="mb-1 fw-bold" style={{ color: "#ffffff", fontSize: "1.15rem" }}>
                        {dashboardHeaderTitle}
                    </h4>
                    <p className="mb-0" style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                        {dashboardSettings?.dashboardSubtitle ||
                            "Sistem Monitoring & Pelaporan Good Corporate Governance"}
                    </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                    <span
                        style={{
                            backgroundColor: "rgba(255,255,255,0.15)",
                            color: "#fff",
                            borderRadius: 20,
                            padding: "4px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            border: "1px solid rgba(255,255,255,0.3)",
                        }}
                    >
                        ● Live
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>
                        Per {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                </div>
            </div>

            {/* ── Row 1: KPI Cards ─────────────────────────────────────────── */}
            <div className="row g-3">
                <div className={isBasicUser ? "col-sm-6 col-xl-6" : "col-sm-6 col-xl-4"}>
                    <KpiCard
                        icon="icon-bar-graph"
                        iconBg="#e8f3ee"
                        iconColor="#2b4c3d"
                        label="GCG Score Terkini"
                        value={`${latestGcg.value.toFixed(2)}`}
                        sub={`Tahun ${latestGcg.year} — Kategori Very Good`}
                        badge={`${gcgDelta >= 0 ? "▲" : "▼"} ${Math.abs(gcgDelta).toFixed(2)} vs ${previousGcg.year}`}
                        badgeColor={gcgDelta >= 0 ? "#2b4c3d" : "#dc2626"}
                        href={isBasicUser ? undefined : "/assessment-gcg"}
                    />
                </div>
                <div className={isBasicUser ? "col-sm-6 col-xl-6" : "col-sm-6 col-xl-4"}>
                    <KpiCard
                        icon="icon-check"
                        iconBg="#dbeafe"
                        iconColor="#1d4ed8"
                        label="Sertifikasi ISO 37001"
                        value="Tersertifikasi"
                        sub="SMAP — Anti Penyuapan"
                        badge="Valid"
                        badgeColor="#1d4ed8"
                        href={isBasicUser ? undefined : "/assessment/sertifikasi-iso-37001"}
                    />
                </div>
                {!isBasicUser && (
                    <div className="col-sm-6 col-xl-4">
                        <KpiCard
                            icon="icon-paper"
                            iconBg="#fef3c7"
                            iconColor="#b45309"
                            label="Laporan WBS"
                            value={isWbsLoading ? "—" : `${totalLaporan} Laporan`}
                            sub={isWbsLoading ? "Memuat..." : `${totalTindak} Ditindaklanjuti (${wbsScore.toFixed(0)}%)`}
                            badge={isWbsLoading ? undefined : `${wbsScore.toFixed(0)}% TL`}
                            badgeColor={wbsScore >= 70 ? "#2b4c3d" : "#b45309"}
                            href="/laporan-wbs"
                        />
                    </div>
                )}
            </div>

            {/* ── Row 2: Charts ────────────────────────────────────────────── */}
            <div className="row g-3">

                {/* Tren GCG Score */}
                <div className={isBasicUser ? "col-lg-6" : "col-lg-4"}>
                    <div className="card h-100 shadow-sm" style={{ borderRadius: 8 }}>
                        <div className="card-body p-3">
                            <div className="d-flex align-items-start justify-content-between mb-3">
                                <SectionTitle>Tren GCG Score</SectionTitle>
                                <span
                                    className="badge"
                                    style={{
                                        backgroundColor: gcgDelta >= 0 ? "#dcfce7" : "#fee2e2",
                                        color: gcgDelta >= 0 ? "#166534" : "#991b1b",
                                        fontSize: 12,
                                        fontWeight: 700,
                                        padding: "4px 10px",
                                        borderRadius: 20,
                                    }}
                                >
                                    {gcgDelta >= 0 ? "▲" : "▼"} {Math.abs(gcgDelta).toFixed(2)}
                                </span>
                            </div>
                            <div className="d-flex align-items-baseline gap-1 mb-3">
                                <span style={{ fontSize: 36, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                                    {latestGcg.value.toFixed(2)}
                                </span>
                                <span className="text-muted" style={{ fontSize: 14 }}>/100</span>
                            </div>
                            <div style={{ width: "100%", height: 140 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={indikatorData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gcgGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2b4c3d" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#2b4c3d" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                        <YAxis hide domain={[70, 100]} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                                            formatter={(value) => [`${Number(value ?? 0).toFixed(2)}`, "GCG Score"]}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#2b4c3d"
                                            strokeWidth={2.5}
                                            fill="url(#gcgGrad)"
                                            dot={{ r: 3, fill: "#2b4c3d" }}
                                            activeDot={{ r: 5 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* WBS Chart + Gauge */}
                {!isBasicUser && (
                    <div className="col-lg-4">
                        <div className="card h-100 shadow-sm" style={{ borderRadius: 8 }}>
                            <div className="card-body p-3">
                                <div className="mb-3">
                                    <SectionTitle>Laporan WBS</SectionTitle>
                                </div>
                                {isWbsLoading ? (
                                    <div className="d-flex align-items-center justify-content-center" style={{ height: 200 }}>
                                        <div className="text-muted" style={{ fontSize: 13 }}>Memuat data WBS...</div>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{ width: "100%", height: 145 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={selectedYears} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                                                        formatter={(value, name) => [
                                                            Number(value ?? 0),
                                                            String(name) === "laporan" ? "Laporan WBS" : "Ditindaklanjuti",
                                                        ]}
                                                    />
                                                    <Legend
                                                        formatter={(v) => (
                                                            <span style={{ fontSize: 11, color: "#64748b" }}>
                                                                {v === "laporan" ? "Laporan WBS" : "Ditindaklanjuti"}
                                                            </span>
                                                        )}
                                                    />
                                                    <Bar dataKey="laporan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="tindak" fill="#2b4c3d" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="d-flex align-items-center justify-content-center mt-2">
                                            <GaugeSemiCircle value={wbsScore} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Profil Laporan */}
                <div className={isBasicUser ? "col-lg-6" : "col-lg-4"}>
                    <div className="card h-100 shadow-sm" style={{ borderRadius: 8 }}>
                        <div className="card-body p-3">
                            <div className="mb-3">
                                <SectionTitle>{isBasicUser ? "Profil Modul" : "Profil Laporan"}</SectionTitle>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {visibleLaporanItems.map((item) => {
                                    const badge = statusBadge(item.status);
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            style={{ textDecoration: "none" }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 10,
                                                    padding: "8px 10px",
                                                    borderRadius: 7,
                                                    border: "1px solid #f1f5f9",
                                                    backgroundColor: "#fafafa",
                                                    transition: "background 0.15s",
                                                    cursor: "pointer",
                                                }}
                                                onMouseEnter={(e) =>
                                                    (e.currentTarget.style.backgroundColor = item.bg)
                                                }
                                                onMouseLeave={(e) =>
                                                    (e.currentTarget.style.backgroundColor = "#fafafa")
                                                }
                                            >
                                                <div
                                                    style={{
                                                        width: 30,
                                                        height: 30,
                                                        borderRadius: 7,
                                                        backgroundColor: item.bg,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    <i className={item.icon} style={{ color: item.color, fontSize: 14 }}></i>
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: "#1e293b",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                        title={item.title}
                                                    >
                                                        {item.title}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{item.period}</div>
                                                </div>
                                                <span
                                                    style={{
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        padding: "2px 7px",
                                                        borderRadius: 10,
                                                        backgroundColor: badge.bg,
                                                        color: badge.color,
                                                        flexShrink: 0,
                                                    }}
                                                >
                                                    {badge.label}
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Row 3: Agenda + Kajian/ISO ───────────────────────────────── */}
            <div className="row g-3">

                {/* Agenda GCG 2025 */}
                <div className="col-lg-7">
                    <div className="card h-100 shadow-sm" style={{ borderRadius: 8 }}>
                        <div className="card-body p-3">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <SectionTitle>Agenda GCG 2025</SectionTitle>
                                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                    {agendaItems.filter((a) => a.status === "done").length}/{agendaItems.length} Selesai
                                </span>
                            </div>

                            {/* Progress bar total */}
                            <div className="mb-4">
                                <div
                                    style={{
                                        height: 6,
                                        backgroundColor: "#f1f5f9",
                                        borderRadius: 999,
                                        overflow: "hidden",
                                    }}
                                >
                                    <div
                                        style={{
                                            height: "100%",
                                            width: `${(agendaItems.filter((a) => a.status === "done").length / agendaItems.length) * 100}%`,
                                            backgroundColor: "#2b4c3d",
                                            borderRadius: 999,
                                            transition: "width 0.8s ease",
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                                {agendaItems.map((item, idx) => {
                                    const s = agendaStyle(item.status);
                                    const isLast = idx === agendaItems.length - 1;
                                    return (
                                        <div key={idx} style={{ display: "flex", gap: 14, opacity: s.opacity }}>
                                            {/* Timeline dot + line */}
                                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 20 }}>
                                                <div
                                                    style={{
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: "50%",
                                                        backgroundColor: s.dot,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        color: "#fff",
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                        flexShrink: 0,
                                                        boxShadow: item.status === "ongoing" ? `0 0 0 3px ${s.dot}33` : "none",
                                                    }}
                                                >
                                                    {s.icon}
                                                </div>
                                                {!isLast && (
                                                    <div
                                                        style={{
                                                            width: 2,
                                                            flex: 1,
                                                            minHeight: 24,
                                                            backgroundColor: "#e2e8f0",
                                                            margin: "3px 0",
                                                        }}
                                                    />
                                                )}
                                            </div>
                                            {/* Content */}
                                            <div style={{ paddingBottom: isLast ? 0 : 14, flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
                                                        {item.label}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontSize: 10,
                                                            fontWeight: 700,
                                                            color:
                                                                item.status === "done"
                                                                    ? "#166534"
                                                                    : item.status === "ongoing"
                                                                    ? "#92400e"
                                                                    : "#64748b",
                                                            backgroundColor:
                                                                item.status === "done"
                                                                    ? "#dcfce7"
                                                                    : item.status === "ongoing"
                                                                    ? "#fef3c7"
                                                                    : "#f1f5f9",
                                                            padding: "2px 8px",
                                                            borderRadius: 10,
                                                            whiteSpace: "nowrap",
                                                            marginLeft: 8,
                                                        }}
                                                    >
                                                        {item.date}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{item.desc}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kajian + ISO + Penghargaan */}
                <div className="col-lg-5">
                    <div style={{ display: "flex", flexDirection: "column", gap: 14, height: "100%" }}>

                        {/* Kajian Internal */}
                        <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                            <div className="card-body p-3">
                                <SectionTitle>Kajian Internal GCG</SectionTitle>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {[
                                        { label: "Tahun 2025", value: dashboardSettings?.kajian2025 || "100%", status: "Selesai" },
                                        { label: "Tahun 2024", value: dashboardSettings?.kajian2024 || "98%", status: "Arsip" },
                                    ].map((row) => (
                                        <div
                                            key={row.label}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "8px 10px",
                                                backgroundColor: "#f8fafc",
                                                borderRadius: 7,
                                                border: "1px solid #f1f5f9",
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{row.label}</div>
                                                <div style={{ fontSize: 10, color: "#94a3b8" }}>{row.status}</div>
                                            </div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#2b4c3d" }}>{row.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Regulasi Utama */}
                        <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                            <div className="card-body p-3">
                                <SectionTitle>Regulasi Utama</SectionTitle>
                                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                    {[
                                        { code: "Per-01/MBU/03/2023", title: "TJSL BUMN" },
                                        { code: "Per-02/MBU/03/2023", title: "Tata Kelola BUMN" },
                                        { code: "Per-03/MBU/03/2023", title: "Organ & SDM BUMN" },
                                    ].map((reg) => (
                                        <div
                                            key={reg.code}
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "6px 10px",
                                                backgroundColor: "#f8fafc",
                                                borderRadius: 6,
                                                border: "1px solid #f1f5f9",
                                            }}
                                        >
                                            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{reg.code}</span>
                                            <span
                                                style={{
                                                    fontSize: 10,
                                                    backgroundColor: "#dcfce7",
                                                    color: "#166534",
                                                    padding: "2px 7px",
                                                    borderRadius: 10,
                                                    fontWeight: 700,
                                                }}
                                            >
                                                Berlaku
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Approval Pernyataan Kepatuhan */}
                        {!isBasicUser && (
                            <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                                <div className="card-body p-3">
                                    <div className="d-flex align-items-center justify-content-between mb-2">
                                        <SectionTitle>Approval Kepatuhan</SectionTitle>
                                        <Link href="/approval-pernyataan-kepatuhan" style={{ fontSize: 11, color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>
                                            Detail →
                                        </Link>
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "8px 10px",
                                                backgroundColor: "#f8fafc",
                                                borderRadius: 7,
                                                border: "1px solid #f1f5f9",
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                                                    {approvalStats?.currentYear ?? 2025}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#94a3b8" }}>Tahun berjalan</div>
                                            </div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#0f766e" }}>{approvalCurrentText}</div>
                                        </div>
                                        <div
                                            style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "8px 10px",
                                                backgroundColor: "#f8fafc",
                                                borderRadius: 7,
                                                border: "1px solid #f1f5f9",
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
                                                    {approvalStats?.previousYear ?? 2024}
                                                </div>
                                                <div style={{ fontSize: 10, color: "#94a3b8" }}>Tahun sebelumnya</div>
                                            </div>
                                            <div style={{ fontSize: 20, fontWeight: 800, color: "#2563eb" }}>{approvalPreviousText}</div>
                                        </div>
                                        <div style={{ fontSize: 11, color: "#64748b" }}>
                                            Rata-rata approval: <strong style={{ color: "#0f766e" }}>{approvalAverageText}</strong>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ISO + Berita GCG */}
                        <div className="card shadow-sm flex-grow-1" style={{ borderRadius: 8 }}>
                            <div className="card-body p-3">
                                <SectionTitle>ISO 37001 & Berita GCG</SectionTitle>
                                <div style={{ fontSize: 12, color: "#475569", marginBottom: 10 }}>
                                    {dashboardSettings?.isoNote || "Sertifikasi SNI ISO 37001:2016 tersedia dan dapat diakses langsung."}
                                </div>
                                <div className="d-flex gap-2 mb-3">
                                    {!isBasicUser && (
                                        <>
                                            <Link
                                                href={ISO_37001_ASSESSMENT_ROUTE}
                                                className="btn btn-sm"
                                                style={{ backgroundColor: "#2b4c3d", color: "#fff", fontSize: 12, borderRadius: 6 }}
                                            >
                                                <i className="ti-eye me-1"></i> Sertifikat
                                            </Link>
                                            <a
                                                href={ISO_37001_PDF_PATH}
                                                download
                                                className="btn btn-sm btn-outline-secondary"
                                                style={{ fontSize: 12, borderRadius: 6 }}
                                            >
                                                <i className="ti-download me-1"></i> Unduh
                                            </a>
                                        </>
                                    )}
                                </div>
                                <div style={{ padding: "8px 10px", backgroundColor: "#fefce8", borderRadius: 7, border: "1px solid #fef08a" }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 2 }}>📰 Berita GCG</div>
                                    <div style={{ fontSize: 11, color: "#78350f", display: "flex", flexDirection: "column", gap: 3 }}>
                                        {renderPenghargaanLines.length > 0 ? (
                                            renderPenghargaanLines.map((line, index) => (
                                                <div key={`${index}-${line}`} style={{ display: "flex", gap: 6 }}>
                                                    <span style={{ flexShrink: 0 }}>•</span>
                                                    <span>{line}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: "#a16207" }}>Belum ada data berita GCG.</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
