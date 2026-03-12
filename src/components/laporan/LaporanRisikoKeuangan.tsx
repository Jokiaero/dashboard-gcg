"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
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
        ? (riskData.reduce((sum: number, r: RiskItem) => sum + (r.impact * r.likelihood), 0) / totalRisiko).toFixed(1)
        : "0.0";

    const kris = [
        { title: "Total Risiko", value: totalRisiko, desc: "Risiko terdaftar", color: "text-slate-700", bg: "bg-slate-100" },
        { title: "Risiko Ekstrem", value: extremeCount, desc: "Prioritas mitigasi segera", color: "text-red-600", bg: "bg-red-100" },
        { title: "Risiko Tinggi", value: highCount, desc: "Dalam pemantauan ketat", color: "text-orange-600", bg: "bg-orange-100" },
        { title: "Rata-rata Skor", value: avgScore, desc: "Skor (Impact x Likelihood)", color: "text-blue-600", bg: "bg-blue-100" },
    ];
    
    // Matrix: 5 Impact (Y) x 5 Likelihood (X)
    // 5 is top (Highest Impact), 1 is bottom (Lowest Impact)
    const getCellColor = (impact: number, likelihood: number) => {
        const score = impact * likelihood;
        if (score >= 20) return "bg-red-500 hover:bg-red-600";
        if (score >= 12) return "bg-orange-500 hover:bg-orange-600";
        if (score >= 6) return "bg-yellow-400 hover:bg-yellow-500";
        return "bg-emerald-400 hover:bg-emerald-500";
    };

    const getRisksInCell = (impact: number, likelihood: number) => {
        return riskData.filter((r: RiskItem) => r.impact === impact && r.likelihood === likelihood);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        Laporan Risiko Keuangan
                    </h1>
                    <p className="text-slate-500 mt-1 pb-1">
                        Dashboard pemantauan risiko keuangan perusahaan
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-slate-100/80 text-slate-600 rounded-full text-sm font-medium border border-slate-200">
                        Q1 2026
                    </span>
                    {isLoading && (
                        <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm font-medium border border-amber-200">
                            Memuat Data...
                        </span>
                    )}
                    <button className="px-4 py-2 bg-[#2b4c3d] text-white rounded-lg text-sm font-medium hover:bg-[#1e362b] transition-colors flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Ekspor PDF
                    </button>
                </div>
            </div>

            {/* KRI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kris.map((kri, idx) => (
                    <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-full ${kri.bg} ${kri.color} flex items-center justify-center shrink-0`}>
                                <span className="text-xl font-bold">{kri.value}</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">{kri.title}</h3>
                                <p className="text-sm text-slate-600 mt-1">{kri.desc}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {!isLoading && riskData.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                    Belum ada data asli Risiko Keuangan. Silakan import data terlebih dahulu.
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                
                {/* 5x5 Heatmap Matrix */}
                <div className="xl:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6">Heatmap Risiko Keuangan</h2>
                    
                    <div className="relative pt-6 pl-8 pb-5">
                        {/* Y-Axis Label */}
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -rotate-90 text-sm font-medium text-slate-500 tracking-wider">
                            IMPACT
                        </div>
                        
                        {/* Grid */}
                        <div className="grid grid-cols-5 gap-1 aspect-square">
                            {[5, 4, 3, 2, 1].map((impact) => (
                                [1, 2, 3, 4, 5].map((likelihood) => {
                                    const cellRisks = getRisksInCell(impact, likelihood);
                                    return (
                                        <div 
                                            key={`${impact}-${likelihood}`}
                                            className={`${getCellColor(impact, likelihood)} rounded flex items-center justify-center cursor-pointer transition-colors relative group`}
                                            title={`Impact: ${impact}, Likelihood: ${likelihood}`}
                                        >
                                            {cellRisks.length > 0 && (
                                                <div className="w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-xs font-bold text-slate-800 shadow-sm">
                                                    {cellRisks.length}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            ))}
                        </div>
                        
                        {/* X-Axis Label */}
                        <div className="absolute bottom-0 left-8 right-0 text-center text-sm font-medium text-slate-500 tracking-wider">
                            LIKELIHOOD
                        </div>
                    </div>
                    
                    <div className="flex justify-center gap-4 mt-4 text-xs font-medium text-slate-500">
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-emerald-400"></div> Low</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> Med</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> High</div>
                        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Extr</div>
                    </div>
                </div>

                {/* Risk Distribution Chart */}
                <div className="xl:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col">
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Sebaran Risiko Keuangan</h2>
                    <p className="text-xs text-slate-500 mb-4">Berdasarkan level (Extreme, High, Medium, Low)</p>
                    <div className="flex-1 min-h-[250px] w-full relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Extreme', value: riskData.filter((r: RiskItem) => r.level === 'Extreme').length, color: '#ef4444' },
                                        { name: 'High', value: riskData.filter((r: RiskItem) => r.level === 'High').length, color: '#f97316' },
                                        { name: 'Medium', value: riskData.filter((r: RiskItem) => r.level === 'Medium').length, color: '#eab308' },
                                        { name: 'Low', value: riskData.filter((r: RiskItem) => r.level === 'Low').length, color: '#10b981' }
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {([
                                        { name: 'Extreme', value: riskData.filter((r: RiskItem) => r.level === 'Extreme').length, color: '#ef4444' },
                                        { name: 'High', value: riskData.filter((r: RiskItem) => r.level === 'High').length, color: '#f97316' },
                                        { name: 'Medium', value: riskData.filter((r: RiskItem) => r.level === 'Medium').length, color: '#eab308' },
                                        { name: 'Low', value: riskData.filter((r: RiskItem) => r.level === 'Low').length, color: '#10b981' }
                                    ].filter(d => d.value > 0)).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <RechartsTooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '13px' }}
                                    formatter={(value: any, name: any) => [value, name]}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', bottom: -10 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Table */}
                <div className="xl:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-slate-900">Top Risiko Keuangan</h2>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Cari risiko..." 
                                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#2b4c3d]/20 transition-all w-64"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 bg-slate-50 uppercase">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">ID</th>
                                    <th className="px-4 py-3">Risk Event</th>
                                    <th className="px-4 py-3">Level</th>
                                    <th className="px-4 py-3 text-center">Score (I×L)</th>
                                    <th className="px-4 py-3">Owner</th>
                                    <th className="px-4 py-3 text-center rounded-tr-lg">Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riskData.length === 0 ? (
                                    <tr>
                                        <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                                            Belum ada data risiko keuangan.
                                        </td>
                                    </tr>
                                ) : riskData.map((risk: RiskItem, idx: number) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-900">{risk.id}</td>
                                        <td className="px-4 py-3 text-slate-700">{risk.risk}</td>
                                        <td className="px-4 py-3">
                                            <Badge variant="outline" className={
                                                risk.level === 'Extreme' ? 'border-red-200 bg-red-50 text-red-700' :
                                                risk.level === 'High' ? 'border-orange-200 bg-orange-50 text-orange-700' :
                                                'border-yellow-200 bg-yellow-50 text-yellow-700'
                                            }>
                                                {risk.level}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3 text-center font-medium">
                                            {risk.impact * risk.likelihood}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{risk.owner}</td>
                                        <td className="px-4 py-3 text-center">
                                            {risk.trend === 'up' ? (
                                                <svg className="w-4 h-4 text-red-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                                            ) : risk.trend === 'down' ? (
                                                <svg className="w-4 h-4 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4 text-slate-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" /></svg>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
}
