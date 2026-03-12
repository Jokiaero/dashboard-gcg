import DashboardLayout from "@/components/DashboardLayout";
import LaporanWBS from "@/components/laporan/LaporanWBS";

export const metadata = {
    title: "Laporan WBS | GCG Dashboard",
};

export default function LaporanWBSPage() {
    return (
        <DashboardLayout>
            <div className="p-4 sm:p-8">
                <LaporanWBS />
            </div>
        </DashboardLayout>
    );
}
