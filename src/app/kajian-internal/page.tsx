import DashboardLayout from "@/components/DashboardLayout";
import KajianInternal from "@/components/kajian/KajianInternal";

export const metadata = {
    title: "Kajian Internal GCG | GCG Dashboard",
};

export default function KajianInternalPage() {
    return (
        <DashboardLayout>
            <div className="p-4 sm:p-8">
                <KajianInternal />
            </div>
        </DashboardLayout>
    );
}
