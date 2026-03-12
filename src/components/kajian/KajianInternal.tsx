"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from "recharts";

const documentCategories = ["Semua", "Kajian"];

const documents = [
    {
        id: "KAJ-001",
        title: "Review GCG terkait Sentralisasi Pengadaan ke SIG",
        category: "Kajian",
        date: "12 Mar 2026",
        author: "Tim GCG Internal",
        size: "0.91 MB",
        status: "Final",
        description: "Dokumen kajian terkait sentralisasi pengadaan dan implikasinya terhadap tata kelola perusahaan.",
        href: "/assets/kajian/review-gcg-terkait-sentralisasi-pengadaan-ke-sig.pdf"
    },
    {
        id: "KAJ-002",
        title: "Review untuk Karyawan - Saudara Kandung dalam 1 Direktorat atau Department",
        category: "Kajian",
        date: "12 Mar 2026",
        author: "Tim GCG Internal",
        size: "0.37 MB",
        status: "Final",
        description: "Kajian terhadap potensi benturan kepentingan untuk karyawan dengan relasi saudara kandung dalam unit organisasi yang sama.",
        href: "/assets/kajian/review-karyawan-saudara-kandung-satu-direktorat-department.pdf"
    },
    {
        id: "KAJ-003",
        title: "Review untuk Karyawan Pasangan Suami Istri dalam 1 Direktorat-Department",
        category: "Kajian",
        date: "12 Mar 2026",
        author: "Tim GCG Internal",
        size: "0.38 MB",
        status: "Final",
        description: "Kajian terhadap kebijakan penempatan pasangan suami istri dalam lingkup direktorat/department yang sama.",
        href: "/assets/kajian/review-karyawan-pasangan-suami-istri-satu-direktorat-department.pdf"
    }
];

export default function KajianInternal() {
    const [activeTab, setActiveTab] = useState("Semua");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredDocs = documents.filter(doc => {
        const matchesTab = activeTab === "Semua" || doc.category === activeTab;
        const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              doc.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const categoryStats = useMemo(() => {
        return [
            { name: 'Kajian', value: documents.filter(d => d.category === 'Kajian').length, color: '#3b82f6' },
        ].filter(d => d.value > 0);
    }, []);

    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Header & Search */}
            <div className="bg-[#2b4c3d] rounded-2xl p-8 sm:p-10 shadow-lg text-white relative overflow-hidden">
                {/* Decorative Pattern */}
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                </div>

                <div className="relative z-10 max-w-3xl">
                    <Badge className="bg-white/20 hover:bg-white/30 text-white mb-4 border-none backdrop-blur-sm">
                        Knowledge Base
                    </Badge>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                        Pustaka Kajian Internal GCG
                    </h1>
                    <p className="text-[#a5c2b4] text-lg mb-8 max-w-2xl">
                        Akses repositori terpusat untuk seluruh dokumen pedoman, evaluasi, dan laporan terkait Good Corporate Governance di PT Semen Baturaja.
                    </p>

                    <div className="relative flex items-center w-full max-w-2xl">
                        <div className="absolute left-4 text-slate-400">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Cari judul dokumen, ID, atau kata kunci..." 
                            className="w-full pl-12 pr-4 py-4 rounded-xl text-slate-900 bg-white placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-4 focus:ring-white/20 transition-all text-sm sm:text-base border-0"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <button className="absolute right-2 px-4 py-2 bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-lg text-sm font-medium transition-colors">
                            Cari
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area with Chart and Document List */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Stats Sidebar */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center">
                        <h2 className="text-base font-semibold text-slate-900 w-full text-left mb-4">Statistik Kategori</h2>
                        <div className="w-full h-[220px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryStats}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {categoryStats.map((entry, index) => (
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
                </div>

                <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[500px] flex flex-col">
                    
                    {/* Tabs */}
                <div className="border-b border-slate-100 px-4 sm:px-6 overflow-x-auto hide-scrollbar">
                    <div className="flex items-center gap-6 min-w-max">
                        {documentCategories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={`py-4 text-sm font-medium transition-colors relative ${
                                    activeTab === cat 
                                    ? "text-[#2b4c3d]" 
                                    : "text-slate-500 hover:text-slate-800"
                                }`}
                            >
                                {cat}
                                {activeTab === cat && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#f59e0b] rounded-t-full" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Document List */}
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 xlg:grid-cols-3 gap-6">
                    {filteredDocs.length > 0 ? (
                        filteredDocs.map((doc) => (
                            <div key={doc.id} className="group border border-slate-100 rounded-xl p-5 hover:border-[#2b4c3d]/30 hover:shadow-md transition-all flex flex-col bg-slate-50/50 hover:bg-white">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2">
                                        <Badge variant="outline" className={`
                                            ${doc.category === 'Kajian' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}
                                        `}>
                                            {doc.category}
                                        </Badge>
                                        {doc.status === 'Draft' && (
                                            <Badge variant="secondary" className="bg-slate-200 text-slate-700 border-none">Draft</Badge>
                                        )}
                                    </div>
                                    <span className="text-xs font-medium text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100">
                                        {doc.id}
                                    </span>
                                </div>
                                
                                <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2 group-hover:text-[#2b4c3d] transition-colors cursor-pointer">
                                    {doc.title}
                                </h3>
                                
                                <p className="text-sm text-slate-500 mb-6 line-clamp-3 flex-1">
                                    {doc.description}
                                </p>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                    <div className="flex items-center gap-3 text-xs text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {doc.date}
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                                        <div>{doc.author}</div>
                                    </div>
                                    
                                    <a
                                        href={doc.href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-[#2b4c3d] hover:text-white transition-colors"
                                        title={`Unduh (${doc.size})`}
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                    </a>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 mb-1">Pencarian Tidak Ditemukan</h3>
                            <p className="text-slate-500">Tidak ada dokumen yang cocok dengan kata kunci "{searchQuery}" pada kategori {activeTab}.</p>
                            <button 
                                onClick={() => { setSearchQuery(""); setActiveTab("Semua"); }}
                                className="mt-4 px-4 py-2 text-[#2b4c3d] font-medium hover:bg-emerald-50 rounded-lg transition-colors"
                            >
                                Reset Pencarian
                            </button>
                        </div>
                    )}
                </div>

                </div>
            </div>
        </div>
    );
}
