import { redirect } from "next/navigation";

export const metadata = {
    title: "Sertifikasi ISO 37001 | GCG Dashboard",
};

export default function SertifikasiISOPage() {
    redirect("/assets/assessment/IABMS-738282.pdf");
}
