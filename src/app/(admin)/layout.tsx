import DashboardLayout from "@/components/layout/DashboardLayout";

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
