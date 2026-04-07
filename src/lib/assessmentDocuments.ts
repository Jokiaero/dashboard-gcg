export type AssessmentDoc = {
    title: string;
    subtitle: string;
    pdfPath: string;
};

export const ISO_37001_PDF_PATH = "/assets/assessment/IABMS_738282.pdf";
export const ISO_37001_ASSESSMENT_ROUTE = "/assessment/sertifikasi-iso-37001";

export const ASSESSMENT_DOCS_BY_SLUG: Record<string, AssessmentDoc> = {
    "sertifikasi-iso-37001": {
        title: "Sertifikasi ISO 37001",
        subtitle: "Sertifikat Sistem Manajemen Anti Penyuapan (SMAP) — IABMS",
        pdfPath: ISO_37001_PDF_PATH,
    },
};
