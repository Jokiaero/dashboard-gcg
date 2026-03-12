import DashboardLayout from "@/components/DashboardLayout";
import AssessmentGCG from "@/components/assessment/AssessmentGCG";

export const metadata = {
    title: "Assessment GCG | GCG Dashboard",
};

export default function AssessmentGCGPage() {
    return (
        <DashboardLayout>
            <div className="p-4 sm:p-8">
                <AssessmentGCG />
            </div>
        </DashboardLayout>
    );
}
