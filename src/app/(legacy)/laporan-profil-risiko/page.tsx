import { redirect } from "next/navigation";

export const metadata = {
    title: "Laporan Risiko Keuangan | GCG Dashboard",
};

export default function LaporanRisikoKeuanganRedirectPage() {
    redirect("/laporan-risiko-keuangan");
}
