import DashboardLayout from "@/components/DashboardLayout";
import SettingsForm from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <DashboardLayout>
      <div className="py-4">
        <SettingsForm />
      </div>
    </DashboardLayout>
  );
}
