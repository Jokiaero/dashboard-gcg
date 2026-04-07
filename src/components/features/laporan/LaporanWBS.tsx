"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

type WbsChartItem = {
  tahun: number | string;
  laporanWbs: number;
  ditindaklanjuti: number;
};

export default function LaporanWBS() {
  const { data: wbsChartData, isLoading: isWbsLoading } = useQuery({
    queryKey: ["wbsChartData"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/wbs");
      if (!res.ok) throw new Error("Gagal memuat data WBS");
      return res.json();
    },
  });

  const yearlyWbsData = (wbsChartData?.data || []).map((item: WbsChartItem) => ({
    tahun: item.tahun,
    laporanWbs: item.laporanWbs,
    ditindaklanjuti: item.ditindaklanjuti,
  }));

  const hasRealWbsData = yearlyWbsData.length > 0;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <h3 className="page-title">Laporan WBS</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
            <li className="breadcrumb-item active">Laporan WBS</li>
          </ol>
        </nav>
      </div>

      {/* Info bar Premium */}
      <div className="row mb-3">
        <div className="col-12">
          <div className="card shadow-sm" style={{ borderRadius: 8, border: "none", background: "linear-gradient(to right, #ffffff, #f8fafc)" }}>
            <div className="card-body py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h6 className="mb-0" style={{ fontWeight: 700, color: "#1e293b", fontSize: "1rem" }}>Optimalisasi Lini Produksi & Maintenance Kiln – PT Semen Baturaja</h6>
                <small style={{ color: "#64748b", fontWeight: 500 }}>Periode: Januari – Juni 2026</small>
              </div>
              <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "6px 14px", borderRadius: 20, fontSize: "0.85rem", fontWeight: 700 }}>✓ On Track</span>
            </div>
          </div>
        </div>
      </div>
      
      {!isWbsLoading && !hasRealWbsData && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">
                  Belum ada data WBS Tahunan yang diunggah. Silakan unggah file Excel melalui Panel Admin.
                        </div>
                    </div>
                </div>
            )}

      <div className="row">
        <div className="col-12">
          {/* Budget Chart */}
          <div className="card grid-margin shadow-sm" style={{ borderRadius: 8, border: "none" }}>
            <div className="card-body">
              <h4 className="card-title">Grafik WBS Tahunan</h4>
              {isWbsLoading ? (
                <p className="text-muted">Memuat data WBS...</p>
              ) : (
                <div style={{ height: 350 }}>
                  {hasRealWbsData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyWbsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="tahun" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                        <Bar dataKey="laporanWbs" name="Laporan WBS" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="ditindaklanjuti" name="Ditindaklanjuti" fill="#10b981" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="d-flex flex-column align-items-center justify-content-center w-100 h-100 text-center rounded" style={{ backgroundColor: "#fefce8", border: "1px dashed #fde047" }}>
                      <small style={{ color: "#a16207" }}>Visualisasi Kosong</small>
                    </div>
                  )}
                </div>
              )}
              <div className="border-top pt-3 mt-2 d-flex justify-content-between">
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>Total Data Tahunan WBS</span>
                <strong>{hasRealWbsData ? yearlyWbsData.length : 0} Tahun</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
