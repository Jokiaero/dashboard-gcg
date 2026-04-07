import AdminContentPanel from "@/components/features/admin/AdminContentPanel";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Panel Admin — Manajemen Konten | Dashboard GCG",
    description: "Upload, kelola, dan hapus dokumen PDF, sertifikat, dan file GCG",
};

export default function AdminPage() {
    return <AdminContentPanel />;
}
