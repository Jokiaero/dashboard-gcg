import DashboardLayout from "@/components/DashboardLayout";
import PenghargaanGcg from "@/components/penghargaan/PenghargaanGcg";

export const metadata = {
    title: "Daftar Penghargaan GCG | GCG Dashboard",
};

export default function PenghargaanPage() {
    return (
        <DashboardLayout>
            <div className="p-4 sm:p-8">
                <PenghargaanGcg />
            </div>
        </DashboardLayout>
    );
}
