import { Metadata } from "next";
import AdminRecyclePanel from "@/components/features/admin/AdminRecyclePanel";

export const metadata: Metadata = {
    title: "Recycle | Dashboard GCG",
    description: "Kelola semua file recycle dari seluruh kategori dokumen GCG",
};

export default function AdminRecyclePage() {
    return <AdminRecyclePanel />;
}
