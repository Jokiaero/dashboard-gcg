"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/shared/ui/badge";
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

export default function LaporanRisikoKeuangan() {
    const { data: riskApiData, isLoading } = useQuery({
        queryKey: ["riskProfileData"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/risk-profile");
            if (!res.ok) throw new Error("Gagal memuat data risiko keuangan");
            return res.json();
        },
    });

    const riskData: RiskItem[] = Array.isArray(riskApiData?.data) ? riskApiData.data : [];

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
    ].filter(d => d.value > 0);

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h3 className="page-title">Laporan Profil Risiko Anti Penyuapan</h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
                        <li className="breadcrumb-item active">Laporan Risiko</li>
                    </ol>
                </nav>
            </div>

            {/* KRI Cards Premium */}
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

            {!isLoading && riskData.length === 0 && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">Belum ada data Risiko Keuangan. Silakan impor data terlebih dahulu.</div>
                    </div>
                </div>
            )}

            <div className="row">
                {/* Heatmap */}
                <div className="col-lg-3 grid-margin stretch-card">
                    <div className="card">
                        <div className="card-body">
                            <h4 className="card-title">Heatmap Risiko</h4>
                            {riskData.length === 0 ? (
                                <div className="d-flex flex-column align-items-center justify-content-center w-100 text-center rounded" style={{ height: 220, backgroundColor: "#fefce8", border: "1px dashed #fde047" }}>
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
                                        ].map(l => <span key={l.label} className={`badge ${l.cls}`}>{l.label}</span>)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pie Chart */}
                <div className="col-lg-3 grid-margin stretch-card">
                    <div className="card">
                        <div className="card-body">
                            <h4 className="card-title">Sebaran Level Risiko</h4>
                            <div style={{ height: 220 }}>
                                {riskData.length === 0 ? (
                                    <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 text-center rounded" style={{ backgroundColor: "#fefce8", border: "1px dashed #fde047" }}>
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

                {/* Risk Table */}
                <div className="col-lg-6 grid-margin stretch-card">
                    <div className="card">
                        <div className="card-body">
                            <h4 className="card-title">Daftar Risiko Keuangan</h4>
                            <div className="table-responsive">
                                <table className="table table-hover table-sm">
                                    <thead className="thead-light">
                                        <tr>
                                            <th>ID</th>
                                            <th>Risk Event</th>
                                            <th>Level</th>
                                            <th className="text-center">Score</th>
                                            <th>Owner</th>
                                            <th className="text-center">Trend</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {riskData.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="text-center text-muted py-4">Belum ada data risiko keuangan.</td>
                                            </tr>
                                        ) : riskData.map((risk: RiskItem, idx: number) => (
                                            <tr key={idx}>
                                                <td><code>{risk.id}</code></td>
                                                <td>{risk.risk}</td>
                                                <td>
                                                    <Badge variant="outline" className={
                                                        risk.level === "Extreme" ? "border-red-200 bg-red-50 text-red-700" :
                                                        risk.level === "High" ? "border-orange-200 bg-orange-50 text-orange-700" :
                                                        "border-yellow-200 bg-yellow-50 text-yellow-700"
                                                    }>
                                                        {risk.level}
                                                    </Badge>
                                                </td>
                                                <td className="text-center font-weight-medium">{risk.impact * risk.likelihood}</td>
                                                <td className="text-muted">{risk.owner}</td>
                                                <td className="text-center">
                                                    {risk.trend === "up" ? "↑" : risk.trend === "down" ? "↓" : "→"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
