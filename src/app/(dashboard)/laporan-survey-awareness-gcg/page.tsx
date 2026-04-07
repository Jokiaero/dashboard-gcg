import Link from "next/link";
import { getExcelStats, formatExcelValue, getCategoryFileSummary } from "@/lib/excel";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Laporan Survey Awareness GCG | GCG Dashboard",
};

export default async function LaporanSurveyAwarenessGcgPage() {
    const stats = await getExcelStats("pelaporan_survey");
    const summary = await getCategoryFileSummary("pelaporan_survey");
    const hasStats = stats.some((value) => value > 0);
    const showNoFileWarning = !hasStats && summary.totalFiles === 0;
    const showPdfOnlyInfo = !hasStats && summary.totalFiles > 0 && summary.excelFiles === 0;
    const showInvalidExcelWarning = !hasStats && summary.excelFiles > 0;

    return (
        <>
            <div className="page-header">
                <h3 className="page-title">Laporan Survey Awareness GCG</h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
                        <li className="breadcrumb-item active">Survey Awareness GCG</li>
                    </ol>
                </nav>
            </div>

            {showNoFileWarning && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">
                            Belum ada data survey yang diunggah. Silakan unggah file Excel melalui Panel Admin.
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

            <div className="row">
                {[
                    { title: "Total Responden", value: formatExcelValue(stats[0] || 0), desc: "Karyawan yang berpartisipasi", border: "#e2e8f0", bg: "#f8fafc", color: "#1e293b" },
                    { title: "Skor Awareness", value: formatExcelValue(stats[1] || 0), desc: "Indeks pemahaman GCG", border: "#fde68a", bg: "#fffbeb", color: "#d97706" },
                    { title: "Unit Tercakup", value: formatExcelValue(stats[2] || 0), desc: "Dari total unit kerja", border: "#bae6fd", bg: "#f0f9ff", color: "#0284c7" },
                ].map((item, idx) => (
                    <div key={idx} className="col-md-4 grid-margin stretch-card">
                        <div className="card shadow-sm" style={{ borderRadius: 10, border: `1px solid ${item.border}`, backgroundColor: item.bg }}>
                            <div className="card-body">
                                <p className="card-title text-muted mb-1" style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>{item.title}</p>
                                <h2 className="mb-1" style={{ color: item.color, fontWeight: 800 }}>{item.value}</h2>
                                <small style={{ color: "#64748b", fontWeight: 500 }}>{item.desc}</small>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
