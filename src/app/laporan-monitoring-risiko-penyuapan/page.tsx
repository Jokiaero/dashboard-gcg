import DashboardLayout from "@/components/DashboardLayout";

export const metadata = {
  title: "Laporan Monitoring Risiko Penyuapan | GCG Dashboard",
};

export default function LaporanMonitoringRisikoPenyuapanPage() {
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Laporan Monitoring Risiko Penyuapan</h1>
          <p className="text-slate-500 mt-2">Ringkasan pemantauan risiko anti penyuapan per periode pelaporan.</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Total Risiko Terpantau</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">0</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Risiko High Priority</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">0</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="text-sm text-slate-500">Mitigasi Selesai</div>
              <div className="text-2xl font-semibold text-slate-900 mt-1">0</div>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Belum ada data asli untuk laporan ini. Silakan import data saat sudah tersedia.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
