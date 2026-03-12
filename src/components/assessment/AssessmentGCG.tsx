"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

const radarData = [
  { subject: 'Transparansi', A: 88, B: 85, fullMark: 100 },
  { subject: 'Akuntabilitas', A: 92, B: 80, fullMark: 100 },
  { subject: 'Responsibilitas', A: 86, B: 90, fullMark: 100 },
  { subject: 'Independensi', A: 95, B: 85, fullMark: 100 },
  { subject: 'Kewajaran', A: 85, B: 88, fullMark: 100 },
];

const yearlyScores = [
  { year: "2020", skor: 92.47 },
  { year: "2021", skor: 93.85 },
  { year: "2022", skor: 94.9 },
  { year: "2023", skor: 88.51 },
  { year: "2024", skor: 92.84 },
];

const improvements = [
  { 
    area: "Evaluasi Komite Dewan Komisaris", 
    aspek: "Independensi", 
    rekomendasi: "Menyusun jadwal rapat khusus evaluasi efektivitas komite secara triwulanan.",
    status: "Dalam Proses",
    pic: "Sekper"
  },
  { 
    area: "Publikasi Kebijakan Keberlanjutan", 
    aspek: "Transparansi", 
    rekomendasi: "Meningkatkan aksesibilitas laporan keberlanjutan melalui portal publik interaktif.",
    status: "Selesai",
    pic: "Corporate Comm"
  },
  { 
    area: "Penerapan Whistleblowing System (WBS)", 
    aspek: "Akuntabilitas", 
    rekomendasi: "Sosialisasi masif jaminan anonimitas pelapor WBS kepada pihak eksternal/vendor.",
    status: "Belum Dimulai",
    pic: "Tim Kepatuhan"
  }
];

export default function AssessmentGCG() {
  const currentScore = yearlyScores[yearlyScores.length - 1].skor;
  const isSangatBaik = currentScore >= 85;

  const handleExportAoIExcel = () => {
    exportToExcel(improvements, "AoI_Assessment_GCG");
  };

  const handleExportAoIPDF = () => {
    const columns = [
      { header: "Area / Temuan", dataKey: "area" },
      { header: "Aspek", dataKey: "aspek" },
      { header: "Rekomendasi", dataKey: "rekomendasi" },
      { header: "PIC", dataKey: "pic" },
      { header: "Status", dataKey: "status" }
    ];
    exportToPDF(improvements, columns, "AoI_Assessment_GCG", "Area of Improvement (AoI) GCG");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#2b4c3d]/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div>
          <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200 mb-3 px-3 py-1">
            Periode Penilaian 2024
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
            Hasil Assessment GCG
          </h1>
          <p className="text-slate-500 max-w-xl">
            Laporan pengukuran kualitas penerapan Tata Kelola Perusahaan yang Baik (Good Corporate Governance) menggunakan metode penilaian sesuai parameter Kementerian BUMN.
          </p>
        </div>

        {/* Big Score Card */}
        <div className="bg-gradient-to-br from-[#2b4c3d] to-[#1e362b] rounded-2xl p-6 text-white shadow-lg min-w-[240px] flex flex-col items-center justify-center relative z-10">
          <div className="text-sm text-[#a5c2b4] font-medium uppercase tracking-wider mb-2">Skor Akhir GCG</div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-5xl font-extrabold">{currentScore.toFixed(2)}</span>
            <span className="text-2xl font-medium text-[#a5c2b4]">/100</span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 rounded-full text-sm font-semibold mt-2">
             {isSangatBaik ? (
                <>
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Predikat: Sangat Baik
                </>
             ) : (
                <>
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Predikat: Baik
                </>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Radar Chart: 5 Pillars of GCG */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Pencapaian 5 Pilar GCG</h2>
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#2b4c3d]"></div> 2025</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-[#f59e0b]"></div> 2024</div>
            </div>
          </div>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#cbd5e1' }} />
                <Radar name="Skor 2025" dataKey="A" stroke="#2b4c3d" fill="#2b4c3d" fillOpacity={0.5} />
                <Radar name="Skor 2024" dataKey="B" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ fontSize: '13px', fontWeight: 600 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Historical Trend Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">GCG Score</h2>
          <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyScores} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                <YAxis domain={[84, 96]} tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: any) => [<span className="font-bold text-[#2b4c3d]">{Number(value).toFixed(2)}</span>, 'Skor']}
                />
                <Line
                  type="monotone"
                  dataKey="skor"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#60a5fa' }}
                  activeDot={{ r: 6 }}
                  name="GCG Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Area of Improvements Table */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-lg font-semibold text-slate-900">Area of Improvement (AoI) GCG</h2>
            <div className="flex gap-2">
                <button 
                  onClick={handleExportAoIExcel}
                  className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                >
                  <i className="ti-import mr-1"></i> Excel
                </button>
                <button 
                  onClick={handleExportAoIPDF}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded hover:bg-rose-100 transition-colors"
                >
                  <i className="ti-import mr-1"></i> PDF
                </button>
            </div>
        </div>
        
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                    <tr>
                        <th className="px-6 py-4 rounded-tl-lg font-semibold">Area / Temuan</th>
                        <th className="px-6 py-4 font-semibold">Aspek</th>
                        <th className="px-6 py-4 font-semibold">Rekomendasi Tindak Lanjut</th>
                        <th className="px-6 py-4 font-semibold">PIC</th>
                        <th className="px-6 py-4 rounded-tr-lg font-semibold text-center">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {improvements.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-900 w-1/4">{item.area}</td>
                            <td className="px-6 py-4 text-slate-600">
                                <Badge variant="outline" className="bg-slate-50 font-normal">{item.aspek}</Badge>
                            </td>
                            <td className="px-6 py-4 text-slate-600 w-1/3 leading-relaxed">{item.rekomendasi}</td>
                            <td className="px-6 py-4 text-slate-900 font-medium">{item.pic}</td>
                            <td className="px-6 py-4 text-center">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    item.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    item.status === 'Dalam Proses' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-slate-100 text-slate-700 border-slate-200'
                                }`}>
                                    {item.status}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      
    </div>
  );
}
