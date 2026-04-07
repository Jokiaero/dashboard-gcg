import { redirect } from "next/navigation";
import { ISO_37001_ASSESSMENT_ROUTE } from "@/lib/assessmentDocuments";

export const metadata = {
    title: "Sertifikasi ISO 37001 | GCG Dashboard",
};

export default function SertifikasiISOPage() {
    redirect(ISO_37001_ASSESSMENT_ROUTE);
}
