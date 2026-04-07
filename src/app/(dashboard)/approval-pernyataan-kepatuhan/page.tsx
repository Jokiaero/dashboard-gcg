import Link from "next/link";
import { getApprovalKepatuhanSeries, getCategoryFileSummary } from "@/lib/excel";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Approval Pernyataan Kepatuhan | GCG Dashboard",
};

function formatPercent(value: number) {
    return `${(value * 100).toFixed(2)}%`;
}

export default async function ApprovalPernyataanKepatuhanPage() {
    const series = await getApprovalKepatuhanSeries("approval_kepatuhan");
    const summary = await getCategoryFileSummary("approval_kepatuhan");
    const hasSeries = series.length > 0;
    const showNoFileWarning = series.length === 0 && summary.totalFiles === 0;
    const showPdfOnlyInfo = series.length === 0 && summary.totalFiles > 0 && summary.excelFiles === 0;
    const showInvalidExcelWarning = series.length === 0 && summary.excelFiles > 0;
    const latestTwoYears = [...series].sort((a, b) => b.year - a.year).slice(0, 2);

    const current = latestTwoYears[0] ?? { year: new Date().getFullYear(), value: 0 };
    const previous = latestTwoYears[1] ?? { year: current.year - 1, value: 0 };
    const average = series.length > 0
        ? series.reduce((sum, item) => sum + item.value, 0) / series.length
        : 0;

    return (
        <>
            <div className="page-header">
                <h3 className="page-title">Approval Pernyataan Kepatuhan</h3>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link href="/">Dashboard</Link></li>
                        <li className="breadcrumb-item active">Approval Pernyataan Kepatuhan</li>
                    </ol>
                </nav>
            </div>

            {showNoFileWarning && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">
                            Belum ada data approval yang diunggah. Silakan unggah file Excel melalui Panel Admin.
                        </div>
                    </div>
                </div>
            )}

            {showPdfOnlyInfo && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-info py-2">
                            Dokumen arsip terdeteksi ({summary.pdfFiles} PDF), namun grafik approval hanya membaca file Excel (.xlsx/.xls).
                        </div>
                    </div>
                </div>
            )}

            {showInvalidExcelWarning && (
                <div className="row mb-3">
                    <div className="col-12">
                        <div className="alert alert-warning py-2">
                            File Excel sudah terdeteksi, tetapi format tahun dan nilai approval belum sesuai.
                        </div>
                    </div>
                </div>
            )}

            {hasSeries && (
                <div className="row">
                    {[
                        {
                            title: `Approval ${current.year}`,
                            value: formatPercent(current.value),
                            desc: "Persentase approval tahun berjalan",
                            border: "#bfdbfe",
                            bg: "#eff6ff",
                            color: "#1d4ed8",
                        },
                        {
                            title: `Approval ${previous.year}`,
                            value: formatPercent(previous.value),
                            desc: "Persentase approval tahun sebelumnya",
                            border: "#bbf7d0",
                            bg: "#f0fdf4",
                            color: "#15803d",
                        },
                        {
                            title: "Rata-Rata",
                            value: formatPercent(average),
                            desc: "Ringkasan tren kepatuhan",
                            border: "#fde68a",
                            bg: "#fffbeb",
                            color: "#b45309",
                        },
                    ].map((item, idx) => (
                        <div key={idx} className="col-md-4 grid-margin stretch-card">
                            <div className="card shadow-sm" style={{ borderRadius: 10, border: `1px solid ${item.border}`, backgroundColor: item.bg }}>
                                <div className="card-body">
                                    <p className="card-title text-muted mb-1" style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>
                                        {item.title}
                                    </p>
                                    <h2 className="mb-1" style={{ color: item.color, fontWeight: 800 }}>{item.value}</h2>
                                    <small style={{ color: "#64748b", fontWeight: 500 }}>{item.desc}</small>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}
