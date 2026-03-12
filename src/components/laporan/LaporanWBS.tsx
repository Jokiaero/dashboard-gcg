"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

const phases = [
  {
    title: "Fase 1: Engineering",
    duration: "Bulan 1",
    tasks: ["Audit energi & pemetaan teknis (Process Flow).", "Penyusunan spesifikasi teknis suku cadang."],
    color: "bg-blue-50 border-blue-200 text-blue-700",
    dotColor: "bg-blue-500",
  },
  {
    title: "Fase 2: Procurement",
    duration: "Bulan 2-3",
    tasks: ["Pemesanan Long Lead Items (Batu tahan api & Gearbox).", "Seleksi dan penunjukan kontraktor spesialis."],
    color: "bg-amber-50 border-amber-200 text-amber-700",
    dotColor: "bg-amber-500",
  },
  {
    title: "Fase 3: Execution/Construction",
    duration: "Bulan 4-5",
    tasks: ["Shutdown mesin (Estimasi 21 hari).", "Penggantian komponen mekanikal & upgrade sistem PLC (Otomasi)."],
    color: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  {
    title: "Fase 4: Closing & Handover",
    duration: "Bulan 6",
    tasks: ["Dry run & Wet run (Uji coba produksi).", "Serah terima aset dan dokumentasi teknis."],
    color: "bg-purple-50 border-purple-200 text-purple-700",
    dotColor: "bg-purple-500",
  },
];

const fallbackBudgets = [
  { name: "Engineering", percent: 5, color: "bg-blue-500" },
  { name: "Procurement", percent: 45, color: "bg-amber-500" },
  { name: "Sipil & Konstruksi", percent: 10, color: "bg-orange-500" },
  { name: "Instalasi & Mekanikal", percent: 30, color: "bg-emerald-500" },
  { name: "Testing & Closing", percent: 10, color: "bg-purple-500" },
];

export default function LaporanWBS() {
  const { data: wbsChartData, isLoading: isWbsLoading } = useQuery({
    queryKey: ["wbsChartData"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/wbs");
      if (!res.ok) throw new Error("Gagal memuat data WBS");
      return res.json();
    },
  });

  const yearlyWbsData = (wbsChartData?.data || []).map((item: any) => ({
    tahun: item.tahun,
    laporanWbs: item.laporanWbs,
    ditindaklanjuti: item.ditindaklanjuti,
  }));

  const hasRealWbsData = yearlyWbsData.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Laporan WBS
          </h1>
          <p className="text-slate-500 mt-1">
            Subjek: Optimalisasi Lini Produksi & Maintenance Kiln – PT Semen Baturaja
          </p>
        </div>
        <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-slate-100/80 text-slate-600 rounded-full text-sm font-medium border border-slate-200">
                Periode: Jan - Jun 2026
            </span>
            <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
                On Track
            </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - WBS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-slate-900">1. Struktur Hierarki Pekerjaan (WBS)</h2>
                <Badge variant="outline" className="text-slate-500">4 Fase Utama</Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {phases.map((phase, idx) => (
                <div key={idx} className={`p-5 rounded-xl border ${phase.color} bg-opacity-30 transition-all hover:shadow-md hover:-translate-y-1`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${phase.dotColor}`} />
                        <h3 className="font-semibold">{phase.title}</h3>
                    </div>
                    <span className="text-xs font-medium px-2 py-1 bg-white/60 rounded-md border border-white/20">
                      {phase.duration}
                    </span>
                  </div>
                  <ul className="space-y-2 mt-3">
                    {phase.tasks.map((task, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <svg className={`w-4 h-4 shrink-0 mt-0.5 opacity-70`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="opacity-90">{task}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">3. Strategi Mitigasi Risiko & KPI</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Risiko */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Matriks Risiko Utama</h3>
                    
                    <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-red-800 font-medium">
                            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Keterlambatan Vendor
                        </div>
                        <p className="text-sm text-red-700/80 mb-2">Risiko keterlambatan pasokan material dari vendor.</p>
                        <div className="bg-white rounded-lg p-3 border border-red-100 text-sm text-slate-600">
                            <span className="font-medium text-slate-700">Mitigasi:</span> Penalti Liquidated Damages (LD) dalam kontrak dan monitoring logistik mingguan.
                        </div>
                    </div>

                    <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2 text-orange-800 font-medium">
                            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            Kecelakaan Ruang Terbatas
                        </div>
                        <p className="text-sm text-orange-700/80 mb-2">Risiko kecelakaan di area Kiln/Silo.</p>
                        <div className="bg-white rounded-lg p-3 border border-orange-100 text-sm text-slate-600">
                            <span className="font-medium text-slate-700">Mitigasi:</span> Sistem Permit to Work (PTW) ketat & pengawasan K3 (HSSE) 24 jam.
                        </div>
                    </div>
                </div>

                {/* KPI */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Indikator Keberhasilan (KPI)</h3>
                    
                    <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Zero Accident</h4>
                                <p className="text-sm text-slate-500 mt-0.5">Tidak ada kecelakaan kerja selama proyek berlangsung.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Efisiensi Biaya</h4>
                                <p className="text-sm text-slate-500 mt-0.5">Penggunaan anggaran tidak melebihi varians ±5%.</p>
                            </div>
                        </div>

                        <div className="flex gap-4 items-start">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-medium text-slate-900">Target Teknis</h4>
                                <p className="text-sm text-slate-500 mt-0.5">Penurunan konsumsi energi listrik 5% per ton semen.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>
        </div>

        {/* Right Column - Budget & Coordination */}
        <div className="space-y-6">
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">2. Jadwal & Alokasi Anggaran</h2>
            {isWbsLoading ? (
              <p className="text-sm text-slate-500 mb-6">Memuat data WBS...</p>
            ) : hasRealWbsData ? (
              <div className="w-full h-[250px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={yearlyWbsData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="tahun" tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fill: "#475569", fontSize: 11 }} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Bar dataKey="laporanWbs" name="Laporan WBS" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ditindaklanjuti" name="Ditindaklanjuti" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="w-full h-[250px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={fallbackBudgets} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 11 }} width={120} />
                    <RechartsTooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: any) => [<span className="font-bold text-slate-800">{value}%</span>, 'Alokasi Budget']}
                    />
                    <Bar dataKey="percent" radius={[0, 6, 6, 0]} barSize={20}>
                      {fallbackBudgets.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={
                          entry.color === 'bg-blue-500' ? '#3b82f6' :
                          entry.color === 'bg-amber-500' ? '#f59e0b' :
                          entry.color === 'bg-orange-500' ? '#f97316' :
                          entry.color === 'bg-emerald-500' ? '#10b981' :
                          '#a855f7'
                        } />
                      ))}
                      <LabelList dataKey="percent" position="right" formatter={(val: any) => `${val}%`} style={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="mt-2 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Total Data Tahunan WBS</span>
                    <span className="font-bold text-slate-900">{hasRealWbsData ? yearlyWbsData.length : 0} Tahun</span>
                </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5">
                <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                </svg>
            </div>
            
            <h2 className="text-lg font-semibold text-slate-900 mb-6">4. Alur Koordinasi</h2>
            <p className="text-sm text-slate-500 mb-6">Dilaporkan melalui sistem ERP (SAP) PT Semen Baturaja.</p>
            
            <div className="space-y-0 relative">
                {/* Connecting line */}
                <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-slate-100"></div>

                <div className="relative pl-10 py-3">
                    <div className="absolute left-0 top-4 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border-4 border-white z-10">
                        <span className="text-xs font-bold">D</span>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-blue-600 uppercase mb-1">Daily Report</div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm">
                            <span className="font-medium text-slate-700">Site Supervisor</span>
                            <span className="mx-2 text-slate-400">→</span>
                            <span className="font-medium text-slate-900">Project Manager</span>
                        </div>
                    </div>
                </div>

                <div className="relative pl-10 py-3">
                    <div className="absolute left-0 top-4 w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center border-4 border-white z-10">
                        <span className="text-xs font-bold">W</span>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-amber-600 uppercase mb-1">Weekly Meeting</div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm">
                            <span className="font-medium text-slate-700">Project Manager</span>
                            <div className="text-slate-400 my-0.5 text-center">↓</div>
                            <span className="font-medium text-slate-900 block text-center">Dept Operasi & Maintenance</span>
                        </div>
                    </div>
                </div>

                <div className="relative pl-10 py-3">
                    <div className="absolute left-0 top-4 w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border-4 border-white z-10">
                        <span className="text-xs font-bold">M</span>
                    </div>
                    <div>
                        <div className="text-xs font-bold text-emerald-600 uppercase mb-1">Monthly Steering</div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm">
                            <span className="font-medium text-slate-700">PMO</span>
                            <span className="mx-2 text-slate-400">→</span>
                            <span className="font-medium text-slate-900">Direksi</span>
                        </div>
                    </div>
                </div>

            </div>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}} />
    </div>
  );
}
