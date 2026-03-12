import DashboardLayout from "@/components/DashboardLayout";
import LaporanTable from "@/components/laporan/LaporanTable";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

export default function HomePage() {
  return (
    <DashboardLayout>
      <DashboardCharts />
      <LaporanTable />
    </DashboardLayout>
  );
}
