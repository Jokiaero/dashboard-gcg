"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import PelaporanExcelTablePanel from "@/components/features/laporan/PelaporanExcelTablePanel";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

type RiskItem = {
    id: string;
    risk: string;
    level: string;
    impact: number;
    likelihood: number;
    owner: string;
    trend: string;
};

type RiskSourceOption = {
    category: string;
    name: string;
    url: string;
    modifiedAt: string;
    size: number;
    type: string;
};

type RiskApiResponse = {
    data: RiskItem[];
    source: string;
    tableHeaders?: string[];
    tableHeaderGroups?: string[];
    tableRows?: string[][];
    sourceFile?: RiskSourceOption | null;
    availableSources?: RiskSourceOption[];
};

export default function LaporanRisikoKeuangan() {
    const [showVisuals, setShowVisuals] = useState(false);
    const [selectedSourceName, setSelectedSourceName] = useState("");

    const { data: riskApiData, isLoading } = useQuery<RiskApiResponse>({
        queryKey: ["riskProfileData", selectedSourceName || "auto"],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedSourceName.trim()) {
                params.set("sourceName", selectedSourceName);
            }

            const endpoint = params.size > 0
                ? `/api/dashboard/risk-profile?${params.toString()}`
                : "/api/dashboard/risk-profile";

            const res = await fetch(endpoint);
            if (!res.ok) throw new Error("Gagal memuat data risiko keuangan");
            return res.json() as Promise<RiskApiResponse>;
        },
    });

    const riskData: RiskItem[] = Array.isArray(riskApiData?.data) ? riskApiData.data : [];
    const hasTableRows = Array.isArray(riskApiData?.tableRows) && riskApiData.tableRows.length > 0;
    const hasAnyData = riskData.length > 0 || hasTableRows;

    const totalRisiko = riskData.length;
    const extremeCount = riskData.filter((r: RiskItem) => r.level === "Extreme").length;
    const highCount = riskData.filter((r: RiskItem) => r.level === "High").length;
    const avgScore = totalRisiko > 0
        ? (riskData.reduce((sum: number, r: RiskItem) => sum + r.impact * r.likelihood, 0) / totalRisiko).toFixed(1)
        : "0.0";

    const getCellColor = (impact: number, likelihood: number) => {
        const score = impact * likelihood;
        if (score >= 20) return "bg-danger";
        if (score >= 12) return "bg-warning";
        if (score >= 6) return "bg-info";
        return "bg-success";
    };

    const getRisksInCell = (impact: number, likelihood: number) =>
        riskData.filter((r: RiskItem) => r.impact === impact && r.likelihood === likelihood);

    const pieData = [
        { name: "Extreme", value: extremeCount, color: "#ef4444" },
        { name: "High", value: highCount, color: "#f97316" },
        { name: "Medium", value: riskData.filter((r: RiskItem) => r.level === "Medium").length, color: "#eab308" },
        { name: "Low", value: riskData.filter((r: RiskItem) => r.level === "Low").length, color: "#10b981" },
    ].filter((d) => d.value > 0);

    return (
        <div>
            <div className="page-header">
                <h3 className="page-title">Laporan Profil Risiko Anti Penyuapan</h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
                        <li className="breadcrumb-item active">Laporan Risiko</li>
                    </ol>
                </nav>
            </div>

            <div className="row">
                {[
                    { title: "Total Risiko", value: totalRisiko, desc: "Risiko terdaftar", color: "#1e293b", bg: "#f8fafc", border: "#e2e8f0" },
                    { title: "Risiko Ekstrem", value: extremeCount, desc: "Prioritas mitigasi segera", color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
                    { title: "Risiko Tinggi", value: highCount, desc: "Dalam pemantauan ketat", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
                    { title: "Rata-rata Skor", value: avgScore, desc: "Skor (Impact × Likelihood)", color: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
                ].map((kri, idx) => (
                    <div key={idx} className="col-md-3 grid-margin stretch-card">
                        <div className="card shadow-sm" style={{ borderRadius: 10, border: `1px solid ${kri.border}`, backgroundColor: kri.bg }}>
                            <div className="card-body">
                                <p className="card-title text-muted mb-1" style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>{kri.title}</p>
                                <h2 className="mb-1" style={{ color: kri.color, fontWeight: 800 }}>{kri.value}</h2>
                                <small style={{ color: "#64748b", fontWeight: 500 }}>{kri.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {isLoading && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-secondary py-2">Memuat data risiko...</div>
                    </div>
                </div>
            )}

            {!isLoading && !hasAnyData && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">Belum ada data Risiko Keuangan. Silakan unggah data Excel melalui Panel Admin.</div>
                    </div>
                </div>
            )}

            <div className="row">
                <div className="col-12 mb-3 d-flex justify-content-end">
                    <button
                        type="button"
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setShowVisuals((prev) => !prev)}
                    >
                        {showVisuals ? "Sembunyikan Matrix & Grafik" : "Tampilkan Matrix & Grafik"}
                    </button>
                </div>

                {showVisuals && (
                    <>
                        <div className="col-lg-6 grid-margin stretch-card">
                            <div className="card">
                                <div className="card-body">
                                    <h4 className="card-title">Heatmap Risiko</h4>
                                    {riskData.length === 0 ? (
                                        <div
                                            className="d-flex flex-column align-items-center justify-content-center w-100 text-center rounded"
                                            style={{ height: 220, backgroundColor: "#fefce8", border: "1px dashed #fde047" }}
                                        >
                                            <small style={{ color: "#a16207" }}>Visualisasi Kosong</small>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="position-relative" style={{ paddingLeft: 28, paddingBottom: 24, paddingTop: 8 }}>
                                                <div
                                                    className="position-absolute text-muted"
                                                    style={{ left: 0, top: "50%", transform: "translateY(-50%) rotate(-90deg)", fontSize: "0.7rem", letterSpacing: "0.05em", whiteSpace: "nowrap" }}
                                                >
                                                    IMPACT
                                                </div>
                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3 }}>
                                                    {[5, 4, 3, 2, 1].map((impact) =>
                                                        [1, 2, 3, 4, 5].map((likelihood) => {
                                                            const cellRisks = getRisksInCell(impact, likelihood);
                                                            return (
                                                                <div
                                                                    key={`${impact}-${likelihood}`}
                                                                    className={`${getCellColor(impact, likelihood)} d-flex align-items-center justify-content-center`}
                                                                    style={{ height: 36, borderRadius: 4, opacity: 0.8 }}
                                                                    title={`Impact: ${impact}, Likelihood: ${likelihood}`}
                                                                >
                                                                    {cellRisks.length > 0 && (
                                                                        <span className="badge badge-light" style={{ fontSize: "0.7rem" }}>{cellRisks.length}</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                                <div className="text-center text-muted mt-2" style={{ fontSize: "0.7rem", letterSpacing: "0.05em" }}>LIKELIHOOD</div>
                                            </div>
                                            <div className="d-flex flex-wrap gap-2 mt-2">
                                                {[
                                                    { label: "Low", cls: "badge-success" },
                                                    { label: "Med", cls: "badge-info" },
                                                    { label: "High", cls: "badge-warning" },
                                                    { label: "Extreme", cls: "badge-danger" },
                                                ].map((legendItem) => (
                                                    <span key={legendItem.label} className={`badge ${legendItem.cls}`}>{legendItem.label}</span>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="col-lg-6 grid-margin stretch-card">
                            <div className="card">
                                <div className="card-body">
                                    <h4 className="card-title">Sebaran Level Risiko</h4>
                                    <div style={{ height: 220 }}>
                                        {riskData.length === 0 ? (
                                            <div
                                                className="d-flex flex-column align-items-center justify-content-center w-100 h-100 text-center rounded"
                                                style={{ backgroundColor: "#fefce8", border: "1px dashed #fde047" }}
                                            >
                                                <small style={{ color: "#a16207" }}>Visualisasi Kosong</small>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value">
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px" }} />
                                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <PelaporanExcelTablePanel
                category="pelaporan_risiko"
                title="Editor Tabel Profil Risiko Anti Penyuapan"
                sourceName={selectedSourceName}
                onSourceNameChange={setSelectedSourceName}
            />
        </div>
    );
}
