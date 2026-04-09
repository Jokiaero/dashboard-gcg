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

type ApprovalChartItem = {
  tahun: number | string;
  nilai: number;
};

type ApprovalSourceOption = {
  category: string;
  name: string;
  url: string;
  modifiedAt: string;
  size: number;
  type: string;
};

type ApprovalApiResponse = {
  data: ApprovalChartItem[];
  source: string;
  sourceFile?: ApprovalSourceOption | null;
  availableSources?: ApprovalSourceOption[];
};

function getSourceLabel(source: string): string {
  if (source === "excel") return "Excel Arsip";
  if (source === "database") return "Database";
  return "Belum Tersedia";
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export default function ApprovalKepatuhan() {
  const [selectedSourceName, setSelectedSourceName] = useState("");

  const { data: approvalApiData, isLoading: isApprovalLoading } = useQuery<ApprovalApiResponse>({
    queryKey: ["approvalKepatuhanChartData", selectedSourceName || "auto"],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedSourceName.trim()) {
        params.set("sourceName", selectedSourceName);
      }

      const endpoint = params.size > 0 ? `/api/dashboard/approval-kepatuhan?${params.toString()}` : "/api/dashboard/approval-kepatuhan";
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Gagal memuat data approval kepatuhan");
      return res.json() as Promise<ApprovalApiResponse>;
    },
  });

  const yearlyApprovalData = (Array.isArray(approvalApiData?.data) ? approvalApiData?.data : [])
    .map((item) => ({
      tahun: String(item.tahun ?? "").trim(),
      nilai: Number(item.nilai || 0),
    }))
    .filter((item) => item.tahun !== "");

  const sourceOptions = Array.isArray(approvalApiData?.availableSources) ? approvalApiData.availableSources : [];
  const activeSourceName = String(approvalApiData?.sourceFile?.name || "");
  const hasRealApprovalData = yearlyApprovalData.length > 0;

  const latestTwoYears = [...yearlyApprovalData].sort((a, b) => {
    const yearA = parseInt(String(a.tahun), 10);
    const yearB = parseInt(String(b.tahun), 10);
    return yearB - yearA;
  }).slice(0, 2);

  const current = latestTwoYears[0] ?? { tahun: new Date().getFullYear().toString(), nilai: 0 };
  const previous = latestTwoYears[1] ?? { tahun: (parseInt(String(current.tahun), 10) - 1).toString(), nilai: 0 };
  const average = yearlyApprovalData.length > 0
    ? yearlyApprovalData.reduce((sum, item) => sum + item.nilai, 0) / yearlyApprovalData.length
    : 0;

  return (
    <div>
      <div className="page-header">
        <h3 className="page-title">Approval Pernyataan Kepatuhan</h3>
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
            <li className="breadcrumb-item active">Approval Pernyataan Kepatuhan</li>
          </ol>
        </nav>
      </div>

      <div className="row">
        {[
          {
            title: `Approval ${current.tahun}`,
            value: formatPercent(current.nilai),
            desc: "Persentase approval tahun berjalan",
            color: "#1d4ed8",
            bg: "#eff6ff",
            border: "#bfdbfe",
          },
          {
            title: `Approval ${previous.tahun}`,
            value: formatPercent(previous.nilai),
            desc: "Persentase approval tahun sebelumnya",
            color: "#047857",
            bg: "#ecfdf5",
            border: "#a7f3d0",
          },
          {
            title: "Rata-Rata",
            value: formatPercent(average),
            desc: "Ringkasan tren kepatuhan",
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

      {!isApprovalLoading && !hasRealApprovalData && (
        <div className="row mb-3">
          <div className="col-12">
            <div className="alert alert-warning py-2 mb-0">
              Belum ada data approval yang terbaca. Pastikan file Excel berisi kolom tahun dan nilai approval.
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
                  <h4 className="card-title mb-1">Grafik Approval Tahunan</h4>
                  <small style={{ color: "#64748b" }}>Tren persentase approval pernyataan kepatuhan per tahun</small>
                </div>
                <span
                  className="badge"
                  style={{
                    backgroundColor: approvalApiData?.source === "excel" ? "#dcfce7" : "#e2e8f0",
                    color: approvalApiData?.source === "excel" ? "#166534" : "#334155",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "8px 12px",
                    borderRadius: 999,
                  }}
                >
                  Sumber: {getSourceLabel(String(approvalApiData?.source || ""))}
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

              {isApprovalLoading ? (
                <p className="text-muted mb-0">Memuat data approval kepatuhan...</p>
              ) : (
                <div style={{ height: 350 }}>
                  {hasRealApprovalData ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={yearlyApprovalData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="tahun" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={true} tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                        <RechartsTooltip
                          formatter={(value) => `${(Number(value) * 100).toFixed(2)}%`}
                          contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                          cursor={{ fill: "rgba(59,130,246,0.08)" }}
                        />
                        <Bar dataKey="nilai" name="Approval %" fill="#2563eb" radius={[4, 4, 0, 0]} />
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
                        APK
                      </div>
                      <h6 className="mb-1" style={{ color: "#9a3412", fontWeight: 700 }}>Visualisasi belum tersedia</h6>
                      <small style={{ color: "#b45309", maxWidth: 480 }}>
                        Data belum terbaca dari sumber terpilih. Pilih file lain atau pastikan format kolom tahun dan nilai approval tersedia.
                      </small>
                    </div>
                  )}
                </div>
              )}

              <div className="border-top pt-3 mt-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
                <span className="text-muted" style={{ fontSize: "0.85rem" }}>Total Data Tahunan Approval</span>
                <strong>{hasRealApprovalData ? yearlyApprovalData.length : 0} Tahun</strong>
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
        category="approval_kepatuhan"
        title="Tabel Data Approval Pernyataan Kepatuhan Sesuai Excel"
        sourceName={selectedSourceName}
        onSourceNameChange={setSelectedSourceName}
      />
    </div>
  );
}
