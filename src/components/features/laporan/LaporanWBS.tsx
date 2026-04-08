"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import PelaporanExcelTablePanel from "@/components/features/laporan/PelaporanExcelTablePanel";

type WbsChartItem = {
  tahun: number | string;
  laporanWbs: number;
  ditindaklanjuti: number;
};

type WbsSourceOption = {
  category: string;
  name: string;
  url: string;
  modifiedAt: string;
  size: number;
  type: string;
};

type WbsApiResponse = {
  data: WbsChartItem[];
  source: string;
  sourceFile?: WbsSourceOption | null;
  availableSources?: WbsSourceOption[];
};

function getSourceLabel(source: string): string {
  if (source === "excel") return "Excel Arsip";
  if (source === "database") return "Database";
  return "Belum Tersedia";
}

export default function LaporanWBS() {
  const [selectedSourceName, setSelectedSourceName] = useState("");

  const { data: wbsApiData, isLoading: isWbsLoading } = useQuery<WbsApiResponse>({
    queryKey: ["wbsChartData", selectedSourceName || "auto"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSourceName.trim()) {
        params.set("sourceName", selectedSourceName);
      }

      const endpoint = params.size > 0 ? `/api/dashboard/wbs?${params.toString()}` : "/api/dashboard/wbs";
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Gagal memuat data WBS");
      return res.json() as Promise<WbsApiResponse>;
    },
  });

  const yearlyWbsData = (Array.isArray(wbsApiData?.data) ? wbsApiData?.data : [])
    .map((item) => ({
      tahun: String(item.tahun ?? "").trim(),
      laporanWbs: Number(item.laporanWbs || 0),
      ditindaklanjuti: Number(item.ditindaklanjuti || 0),
    }))
    .filter((item) => item.tahun !== "");

  const sourceOptions = Array.isArray(wbsApiData?.availableSources) ? wbsApiData.availableSources : [];
  const activeSourceName = String(wbsApiData?.sourceFile?.name || "");
  const hasRealWbsData = yearlyWbsData.length > 0;

  const totalLaporan = yearlyWbsData.reduce((sum, item) => sum + item.laporanWbs, 0);
  const totalDitindaklanjuti = yearlyWbsData.reduce((sum, item) => sum + item.ditindaklanjuti, 0);
  const tindakLanjutRate = totalLaporan > 0 ? Math.round((totalDitindaklanjuti / totalLaporan) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Laporan WBS</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
            <li className="breadcrumb-item active">Laporan WBS</li>
          </ol>
        </nav>
      </div>

      <div className="row">
        {[
          {
            title: "Total Laporan",
            value: totalLaporan,
            desc: "Akumulasi laporan dari data tahunan",
            color: "#1d4ed8",
            bg: "#eff6ff",
            border: "#bfdbfe",
          },
          {
            title: "Total Ditindaklanjuti",
            value: totalDitindaklanjuti,
            desc: "Laporan yang sudah ditindaklanjuti",
            color: "#047857",
            bg: "#ecfdf5",
            border: "#a7f3d0",
          },
          {
            title: "Rasio Tindak Lanjut",
            value: `${tindakLanjutRate}%`,
            desc: "Persentase tindak lanjut terhadap laporan",
            color: "#b45309",
            bg: "#fff7ed",
            border: "#fed7aa",
          },
        ].map((kri, idx) => (
          <div key={idx} className="col-md-4 grid-margin stretch-card">
            <div className="card shadow-sm" style={{ borderRadius: 10, border: `1px solid ${kri.border}`, backgroundColor: kri.bg }}>
              <div className="card-body">
                <p className="card-title text-muted mb-1" style={{ fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase" }}>{kri.title}</p>
                <h2 className="mb-1" style={{ color: kri.color, fontWeight: 800 }}>{kri.value}</h2>
                <small style={{ color: "#64748b", fontWeight: 500 }}>{kri.desc}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!isWbsLoading && !hasRealWbsData && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="alert alert-warning py-2 mb-0">
              Belum ada data WBS yang terbaca. Pastikan file Excel berisi kolom tahun dan nilai laporan.
            </div>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-12">
          <div className="card grid-margin shadow-sm" style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}>
            <div className="card-body">
              <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
                <div>
                  <h4 className="card-title mb-1">Grafik WBS Tahunan</h4>
                  <small style={{ color: "#64748b" }}>Perbandingan jumlah laporan dan tindak lanjut per tahun</small>
                </div>
                <span
                  className="badge"
                  style={{
                    backgroundColor: wbsApiData?.source === "excel" ? "#dcfce7" : "#e2e8f0",
                    color: wbsApiData?.source === "excel" ? "#166534" : "#334155",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "8px 12px",
                    borderRadius: 999,
                  }}
                >
                  Sumber: {getSourceLabel(String(wbsApiData?.source || ""))}
                </span>
              </div>

              {sourceOptions.length > 1 && (
                <div className="mb-3 d-flex flex-column flex-md-row align-items-md-center gap-2">
                  <label className="mb-0 text-muted" style={{ minWidth: 120, fontSize: "0.82rem", fontWeight: 600 }}>
                    Sumber File
                  </label>
                  <select
                    className="form-control form-control-sm"
                    value={selectedSourceName}
                    onChange={(event) => setSelectedSourceName(event.target.value)}
                    style={{ maxWidth: 380 }}
                  >
                    <option value="">Otomatis (data paling lengkap)</option>
                    {sourceOptions.map((source) => (
                      <option key={source.name} value={source.name}>{source.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {isWbsLoading ? (
                <p className="text-muted mb-0">Memuat data WBS...</p>
              ) : (
                <div style={{ height: 350 }}>
                  {hasRealWbsData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyWbsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="tahun" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                          cursor={{ fill: "rgba(59,130,246,0.08)" }}
                        />
                        <Bar dataKey="laporanWbs" name="Laporan WBS" fill="#2563eb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="ditindaklanjuti" name="Ditindaklanjuti" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div
                      className="d-flex flex-column align-items-center justify-content-center w-100 h-100 text-center rounded"
                      style={{
                        background: "linear-gradient(180deg, #fff7ed 0%, #fffbeb 100%)",
                        border: "1px dashed #f59e0b",
                        padding: "1rem",
                      }}
                    >
                      <div
                        className="d-flex align-items-center justify-content-center mb-2"
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: "50%",
                          backgroundColor: "#ffedd5",
                          color: "#9a3412",
                          fontWeight: 800,
                          fontSize: "0.85rem",
                        }}
                      >
                        WBS
                      </div>
                      <h6 className="mb-1" style={{ color: "#9a3412", fontWeight: 700 }}>Visualisasi belum tersedia</h6>
                      <small style={{ color: "#b45309", maxWidth: 480 }}>
                        Data belum terbaca dari sumber terpilih. Pilih file lain atau pastikan format kolom tahun, jumlah laporan, dan tindak lanjut tersedia.
                      </small>
                    </div>
                  )}
                </div>
              )}

              <div className="border-top pt-3 mt-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>Total Data Tahunan WBS</span>
                <strong>{hasRealWbsData ? yearlyWbsData.length : 0} Tahun</strong>
              </div>

              {!!activeSourceName && (
                <small className="d-block mt-2" style={{ color: "#64748b" }}>
                  Sumber aktif: {activeSourceName}
                </small>
              )}
            </div>
          </div>
        </div>
      </div>

      <PelaporanExcelTablePanel
        category="pelaporan_wbs"
        title="Tabel Data WBS Sesuai Excel"
        sourceName={selectedSourceName}
        onSourceNameChange={setSelectedSourceName}
      />
    </div>
  );
}
