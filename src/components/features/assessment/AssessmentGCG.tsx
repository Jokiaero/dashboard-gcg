"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
        ResponsiveContainer, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid
} from "recharts";

type AssessmentPayload = {
  yearlyScores: Array<{ year: string; skor: number }>;
};

export default function AssessmentGCG() {
    const { data: apiData, isLoading } = useQuery({
        queryKey: ["assessmentData"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/assessment");
            if (!res.ok) throw new Error("Gagal mengambil data Assessment");
            return res.json();
        }
    });

    const assessment: AssessmentPayload = apiData?.data || { yearlyScores: [] };
    const hasData = assessment.yearlyScores.length > 0;

    let currentScore = 0;
    if (assessment.yearlyScores.length > 0) {
        currentScore = assessment.yearlyScores[assessment.yearlyScores.length - 1].skor || 0;
    }
    const isSangatBaik = currentScore >= 85;

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <h3 className="page-title">Hasil Assessment GCG</h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
                        <li className="breadcrumb-item active">Assessment GCG</li>
                    </ol>
                </nav>
            </div>

            {isLoading && (
                <div className="alert alert-secondary py-2">Memuat data Assessment...</div>
            )}

            {!isLoading && !hasData && (
                <div className="alert alert-warning py-2 mb-3">
                    Belum ada data grafik Assessment GCG. Silakan unduh template atau unggah Excel melalui Panel Admin.
                </div>
            )}

            {hasData && (
                <>
                    {/* Score Summary */}
                    <div className="row mb-3">
                        <div className="col-12">
                            <div className="card">
                                <div className="card-body py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
                                    <div>
                                        <span className="text-muted" style={{ fontSize: "0.85rem" }}>Update Terakhir Assessment</span>
                                        <p className="mb-0 text-muted">Pengukuran kualitas penerapan GCG menggunakan metode penilaian Kementerian BUMN.</p>
                                    </div>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="text-right">
                                            <div className="text-muted" style={{ fontSize: "0.8rem" }}>Skor Akhir GCG</div>
                                            <div style={{ fontSize: "2rem", fontWeight: 700, color: "#2b4c3d", lineHeight: 1 }}>
                                                {currentScore.toFixed(2)}<span className="text-muted" style={{ fontSize: "1rem" }}>/100</span>
                                            </div>
                                        </div>
                                        <span className={`badge ${isSangatBaik ? "badge-success" : "badge-warning"} px-3 py-2`} style={{ fontSize: "0.85rem" }}>
                                            {isSangatBaik ? "Sangat Baik" : "Menengah"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="row">
                        <div className="col-12 grid-margin stretch-card">
                            <div className="card">
                                <div className="card-body">
                                    <h4 className="card-title">Tren GCG Score</h4>
                                    <div style={{ height: 300 }}>
                                        {assessment.yearlyScores.length === 0 ? (
                                            <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 text-center rounded" style={{ backgroundColor: "#fefce8", border: "1px dashed #fde047" }}>
                                                <small style={{ color: "#a16207" }}>Visualisasi Kosong</small>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={assessment.yearlyScores} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="year" tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                                                    <YAxis domain={['auto', 'auto']} tick={{ fill: "#64748b", fontSize: 12 }} tickLine={false} axisLine={false} />
                                                    <RechartsTooltip
                                                        contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                                                        formatter={(value) => [Number(value ?? 0).toFixed(2), "Skor"]}
                                                    />
                                                    <Line type="monotone" dataKey="skor" stroke="#2b4c3d" strokeWidth={2} dot={{ r: 4, fill: "#2b4c3d" }} activeDot={{ r: 6 }} name="GCG Score" />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
