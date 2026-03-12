import DashboardLayout from "@/components/DashboardLayout";
import LaporanRisikoKeuangan from "@/components/laporan/LaporanRisikoKeuangan";

export const metadata = {
    title: "Laporan Risiko Keuangan | GCG Dashboard",
};

export default function LaporanRisikoKeuanganPage() {
    return (
        <DashboardLayout>
            <div className="p-4 sm:p-8">
                <LaporanRisikoKeuangan />
            </div>
        </DashboardLayout>
    );
}
