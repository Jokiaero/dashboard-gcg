"use client";

import React from "react";
import { Badge } from "@/components/shared/ui/badge";
import { ISO_37001_PDF_PATH } from "@/lib/assessmentDocuments";

const certificateUrl = ISO_37001_PDF_PATH;

export default function SertifikasiISO() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Sertifikat Aktif</Badge>
              <span className="text-sm text-slate-500">Sistem Manajemen Anti Penyuapan (SMAP)</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Sertifikasi ISO 37001:2016</h1>
            <p className="text-slate-500 mt-2">Dokumen sertifikat resmi ditampilkan sesuai file yang Anda berikan.</p>
          </div>

          <div className="flex gap-2">
            <a
              href={certificateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-semibold text-[#2b4c3d] bg-white border border-[#2b4c3d] rounded-lg hover:bg-[#2b4c3d]/5 transition-colors"
            >
              Buka PDF
            </a>
            <a
              href={certificateUrl}
              download
              className="px-4 py-2 text-sm font-semibold text-white bg-[#2b4c3d] border border-[#2b4c3d] rounded-lg hover:bg-[#1f382e] transition-colors"
            >
              Unduh Sertifikat
            </a>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
          <iframe
            title="Sertifikat SMAP IABMS 738282"
            src={certificateUrl}
            className="w-full h-[70vh] min-h-[560px]"
          />
        </div>
      </div>
    </div>
  );
}
