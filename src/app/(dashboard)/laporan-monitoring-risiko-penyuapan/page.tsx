import Link from "next/link";
import { getExcelStats, getCategoryFileSummary } from "@/lib/excel";
import PelaporanExcelTablePanel from "@/components/features/laporan/PelaporanExcelTablePanel";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Laporan Monitoring Risiko Penyuapan | GCG Dashboard",
};

export default async function LaporanMonitoringRisikoPenyuapanPage() {
    const stats = await getExcelStats("pelaporan_penyuapan");
    const summary = await getCategoryFileSummary("pelaporan_penyuapan");
    const hasStats = stats.some((value) => value > 0);
    const showNoFileWarning = !hasStats && summary.totalFiles === 0;
    const showPdfOnlyInfo = !hasStats && summary.totalFiles > 0 && summary.excelFiles === 0;
    const showInvalidExcelWarning = !hasStats && summary.excelFiles > 0;

    return (
        <>
            <div className="page-header">
                <h3 className="page-title">Laporan Monitoring Risiko Penyuapan</h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
                        <li className="breadcrumb-item active">Monitoring Risiko Penyuapan</li>
                    </ol>
                </nav>
            </div>

            {showNoFileWarning && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">
                            Belum ada data monitoring yang diunggah. Silakan unggah file Excel melalui Panel Admin.
                        </div>
                    </div>
                </div>
            )}

            {showPdfOnlyInfo && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-info py-2">
                            Dokumen arsip terdeteksi ({summary.pdfFiles} PDF), namun kartu statistik hanya membaca file Excel (.xlsx/.xls).
                        </div>
                    </div>
                </div>
            )}

            {showInvalidExcelWarning && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">
                            File Excel sudah terdeteksi, tetapi format angkanya belum sesuai template statistik.
                        </div>
                    </div>
                </div>
            )}

            <PelaporanExcelTablePanel
                category="pelaporan_penyuapan"
                title="Tabel Monitoring Risiko Sesuai Excel"
            />
        </>
    );
}
