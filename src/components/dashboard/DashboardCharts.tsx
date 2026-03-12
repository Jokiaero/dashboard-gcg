"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type DashboardStatsResponse = {
    statusStats: Array<{ name: string; value: number }>;
    departmentStats: Array<{ name: string; value: number }>;
};

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
        period: "2021-2025",
        status: "Aktif",
        href: "/laporan-wbs",
    },
    {
        title: "Laporan Profil Risiko Anti Penyuapan",
        category: "Risk & Compliance",
        period: "Tahunan",
        status: "Kosong",
        href: "/laporan-risiko-keuangan",
    },
    {
        title: "Laporan Monitoring Risiko Penyuapan",
        category: "Risk Monitoring",
        period: "Triwulanan",
        status: "Kosong",
        href: "/laporan-monitoring-risiko-penyuapan",
    },
    {
        title: "Laporan Hasil Implementasi PPG ke KPK",
        category: "Implementasi Program",
        period: "Semester",
        status: "Kosong",
        href: "/laporan-implementasi-ppg-kpk",
    },
    {
        title: "Laporan Survey Awareness GCG",
        category: "Survey Internal",
        period: "Tahunan",
        status: "Kosong",
        href: "/laporan-survey-awareness-gcg",
    },
];

function statusBadgeClass(status: string) {
    if (status === "Aktif") {
        return "badge badge-success";
    }

    if (status === "Draft") {
        return "badge badge-warning";
    }

    if (status === "Kosong") {
        return "badge badge-light";
    }

    return "badge badge-secondary";
}

function GaugeSemiCircle({ value }: { value: number }) {
    const radius = 56;
    const stroke = 12;
    const normalized = Math.max(0, Math.min(100, value));
    const circumference = Math.PI * radius;
    const progress = (normalized / 100) * circumference;

    return (
        <svg width="160" height="96" viewBox="0 0 160 96" role="img" aria-label={`Skor ${normalized.toFixed(2)}`}>
            <path
                d="M 20 80 A 60 60 0 0 1 140 80"
                stroke="#e2e8f0"
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
            />
            <path
                d="M 20 80 A 60 60 0 0 1 140 80"
                stroke="#2b4c3d"
                strokeWidth={stroke}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`}
            />
            <text x="80" y="62" textAnchor="middle" className="fw-bold" fill="#1f2937" fontSize="24">
                {normalized.toFixed(2)}
            </text>
            <text x="80" y="82" textAnchor="middle" fill="#64748b" fontSize="12">
                Very Good
            </text>
        </svg>
    );
}

export default function DashboardCharts() {
    const { data: stats, isLoading: isStatsLoading } = useQuery<DashboardStatsResponse>({
        queryKey: ["dashboardStats"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/stats");
            if (!res.ok) throw new Error("Gagal memuat statistik dashboard");
            return res.json();
        },
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

    const indikatorData = dashboardSettings?.gcgScores?.length ? dashboardSettings.gcgScores : defaultIndikatorData;

    const wbsChart = (wbsData?.data || []).map((item) => ({
        tahun: item.tahun,
        laporan: Number(item.laporanWbs || 0),
        tindak: Number(item.ditindaklanjuti || 0),
    }));

    const selectedYears = wbsChart.slice(-4);
    const totalLaporan = wbsChart.reduce((sum, item) => sum + item.laporan, 0);
    const totalTindak = wbsChart.reduce((sum, item) => sum + item.tindak, 0);
    const score = totalLaporan > 0 ? (totalTindak / totalLaporan) * 100 : 0;
    const latestGcg = indikatorData[indikatorData.length - 1];
    const previousGcg = indikatorData[indikatorData.length - 2];
    const gcgDelta = latestGcg.value - previousGcg.value;

    return (
        <div className="row mb-4">
            <div className="col-12 grid-margin stretch-card">
                <div className="card shadow-sm" style={{ borderRadius: 6 }}>
                    <div className="card-body p-4">
                        <h4 className="fw-bold mb-1" style={{ color: "#2b4c3d" }}>
                            {dashboardSettings?.dashboardTitle || "Improvement Dashboard GCG"}
                        </h4>
                        <p className="text-muted mb-3">
                            {dashboardSettings?.dashboardSubtitle || "Meningkatkan Efektivitas dan Efisiensi Pengawasan GCG"}
                        </p>

                        <div className="row g-3">
                            <div className="col-lg-6">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Regulasi GCG</h6>
                                            <ul className="mb-0 ps-3">
                                                <li>Permen Per-02/MBU/03/2023</li>
                                                <li>Regulasi lain yang relevan</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Softstructure GCG</h6>
                                            <ul className="mb-0 ps-3">
                                                <li>Pedoman GCG</li>
                                                <li>Pedoman Perilaku</li>
                                                <li>SOP WBS</li>
                                                <li>Struktur Organisasi GCG</li>
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="col-md-6">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Laporan</h6>
                                            <div className="d-flex flex-column gap-2">
                                                {laporanItems.map((item) => (
                                                    <div key={item.title} className="border rounded p-2" style={{ borderColor: "#e2e8f0" }}>
                                                        <div className="d-flex justify-content-between align-items-start gap-2">
                                                            <div>
                                                                <div className="fw-semibold" style={{ color: "#1f2937" }}>{item.title}</div>
                                                                <div className="small text-muted">{item.category}</div>
                                                            </div>
                                                            <span className={statusBadgeClass(item.status)}>{item.status}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center mt-1 gap-2">
                                                            <div className="small text-muted">Periode: {item.period}</div>
                                                            <Link href={item.href} className="small fw-semibold" style={{ color: "#2b4c3d" }}>
                                                                Buka
                                                            </Link>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Kajian GCG</h6>
                                            <div className="d-flex justify-content-between border-bottom pb-2 mb-2">
                                                <span>Tahun 2025</span>
                                                <strong>{dashboardSettings?.kajian2025 || "100%"}</strong>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span>Tahun 2024</span>
                                                <strong>{dashboardSettings?.kajian2024 || "98%"}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-6">
                                <div className="row g-3">
                                    <div className="col-12">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <div className="d-flex align-items-start justify-content-between gap-3">
                                                <div>
                                                    <h6 className="fw-bold mb-1" style={{ color: "#2b4c3d" }}>GCG Score</h6>
                                                    <div className="small text-muted">Nilai terbaru Assessment GCG ({latestGcg.year})</div>
                                                </div>
                                                <span className={`badge ${gcgDelta >= 0 ? "badge-success" : "badge-warning"}`}>
                                                    {gcgDelta >= 0 ? "+" : ""}{gcgDelta.toFixed(2)}
                                                </span>
                                            </div>

                                            <div className="mt-3 d-flex align-items-end gap-2">
                                                <div className="display-4 fw-bold" style={{ color: "#2b4c3d", lineHeight: 1 }}>
                                                    {latestGcg.value.toFixed(2)}
                                                </div>
                                                <div className="text-muted small pb-1">/100</div>
                                            </div>

                                            <div className="small text-muted mt-2">
                                                Tahun {previousGcg.year}: {previousGcg.value.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Indikator GCG</h6>
                                            <div style={{ width: "100%", height: 130 }}>
                                                <ResponsiveContainer>
                                                    <AreaChart data={indikatorData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="gcgArea" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#2b4c3d" stopOpacity={0.25} />
                                                                <stop offset="95%" stopColor="#2b4c3d" stopOpacity={0.02} />
                                                            </linearGradient>
                                                        </defs>
                                                        <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                                                        <XAxis dataKey="year" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                                        <YAxis hide domain={[70, 100]} />
                                                        <Tooltip />
                                                        <Area type="monotone" dataKey="value" stroke="#2b4c3d" strokeWidth={2} fill="url(#gcgArea)" />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Status Laporan WBS</h6>
                                            {isWbsLoading ? (
                                                <p className="text-muted mb-0">Memuat data WBS...</p>
                                            ) : (
                                                <div className="row align-items-center g-2">
                                                    <div className="col-md-7">
                                                        <div style={{ width: "100%", height: 140 }}>
                                                            <ResponsiveContainer>
                                                                <BarChart data={selectedYears} margin={{ top: 10, right: 0, left: -24, bottom: 0 }}>
                                                                    <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#e2e8f0" />
                                                                    <XAxis dataKey="tahun" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                                                                    <Tooltip />
                                                                    <Bar dataKey="laporan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                                    <Bar dataKey="tindak" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                                                </BarChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>
                                                    <div className="col-md-5 d-flex justify-content-md-end justify-content-center">
                                                        <GaugeSemiCircle value={score} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="col-12">
                                        <div className="border rounded p-3 h-100" style={{ borderColor: "#e2e8f0" }}>
                                            <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Progres ISO 37001</h6>
                                            <div className="small text-muted mb-2">{dashboardSettings?.isoNote || "Sertifikat SMAP tersedia dan dapat diakses langsung."}</div>
                                            <div className="d-flex gap-2 mb-3">
                                                <a href="/assets/assessment/IABMS-738282.pdf" target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ backgroundColor: "#2b4c3d", color: "#fff" }}>
                                                    Buka Sertifikat
                                                </a>
                                                <a href="/assets/assessment/IABMS-738282.pdf" download className="btn btn-sm btn-outline-secondary">
                                                    Unduh
                                                </a>
                                            </div>
                                            <div className="border-top pt-3 mt-3">
                                                <h6 className="fw-bold mb-2" style={{ color: "#2b4c3d" }}>Penghargaan GCG</h6>
                                                <div className="small text-muted">{dashboardSettings?.penghargaanNote || "Data penghargaan belum tersedia."}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isStatsLoading ? (
                            <div className="mt-3 text-muted small">Memuat statistik dashboard...</div>
                        ) : (
                            <div className="mt-3 text-muted small">
                                Total status laporan: {stats?.statusStats?.reduce((sum, item) => sum + item.value, 0) || 0} | Total departemen terdata: {stats?.departmentStats?.length || 0}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
