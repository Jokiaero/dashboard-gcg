export type RegulasiDoc = {
    title: string;
    subtitle: string;
    pdfPath?: string;
    fallbackPdfPaths?: string[];
    externalUrl?: string;
};

export const REGULASI_DOCS_BY_SLUG: Record<string, RegulasiDoc> = {
    "peraturan-menteri": {
        title: "Peraturan Menteri BUMN No. PER-2/MBU/03/2023",
        subtitle: "Pedoman Tata Kelola dan Kegiatan Korporasi Signifikan Badan Usaha Milik Negara",
        pdfPath: "/assets/regulasi/per-2-mbu-03-2023-tahun-2023.pdf",
        fallbackPdfPaths: ["/assets/regulasi/peraturan-menteri.pdf"],
    },
    "per-1-mbu-03-2023-tjsl-bumn": {
        title: "Penugasan Khusus dan Program TJSL BUMN",
        subtitle: "Peraturan Menteri BUMN No. PER-1/MBU/03/2023",
        pdfPath: "/assets/regulasi/PER-1-MBU-03-2023_Penugasan_Khusus_dan_Program_Tanggung_Jawab_Sosial_dan_Lingkungan_Badan_Usaha_Milik_Negara.pdf",
    },
    "per-2-mbu-03-2023-tata-kelola-bumn": {
        title: "Pedoman Tata Kelola dan Kegiatan Korporasi Signifikan BUMN",
        subtitle: "Peraturan Menteri BUMN No. PER-2/MBU/03/2023",
        pdfPath: "/assets/regulasi/per-2-mbu-03-2023-tata-kelola-bumn.pdf",
    },
    "per-3-mbu-03-2023-organ-sdm-bumn": {
        title: "Organ dan Sumber Daya Manusia Badan Usaha Milik Negara",
        subtitle: "Peraturan Menteri BUMN No. PER-3/MBU/03/2023",
        pdfPath: "/assets/regulasi/per-3-mbu-03-2023-organ-sdm-bumn.pdf",
    },
};

export type RegulasiPreset = {
    label: string;
    targetName: string;
};

export type RegulasiUploadOption = {
    slug: string;
    label: string;
    targetName: string;
    fileName: string;
    fallbackFileNames: string[];
};

function getTargetNameFromPath(pdfPath: string): string {
    const fileName = pdfPath.split("/").pop() ?? "";
    return fileName.replace(/\.[^.]+$/, "");
}

export const REGULASI_PRESETS: RegulasiPreset[] = Object.values(REGULASI_DOCS_BY_SLUG)
    .filter((doc): doc is RegulasiDoc & { pdfPath: string } => Boolean(doc.pdfPath))
    .map((doc) => ({
        label: doc.title,
        targetName: getTargetNameFromPath(doc.pdfPath),
    }));

export const REGULASI_UPLOAD_OPTIONS: RegulasiUploadOption[] = Object.entries(REGULASI_DOCS_BY_SLUG)
    .flatMap(([slug, doc]) => {
        if (!doc.pdfPath) {
            return [];
        }
        const fileName = doc.pdfPath.split("/").pop() ?? "";
        const fallbackFileNames = (doc.fallbackPdfPaths ?? [])
            .map((fallbackPath) => fallbackPath.split("/").pop() ?? "")
            .filter(Boolean);
        return [{
            slug,
            label: doc.title,
            targetName: getTargetNameFromPath(doc.pdfPath),
            fileName,
            fallbackFileNames,
        }];
    });

export function getRegulasiFileNameBySlug(slug: string): string | undefined {
    const doc = REGULASI_DOCS_BY_SLUG[slug];
    if (!doc?.pdfPath) {
        return undefined;
    }
    return doc.pdfPath.split("/").pop();
}

export function getRegulasiFallbackFileNamesBySlug(slug: string): string[] {
    const doc = REGULASI_DOCS_BY_SLUG[slug];
    if (!doc?.fallbackPdfPaths?.length) {
        return [];
    }
    return doc.fallbackPdfPaths
        .map((fallbackPath) => fallbackPath.split("/").pop() ?? "")
        .filter(Boolean);
}

const REGULASI_DOCS_BY_FILE_NAME: Record<string, RegulasiDoc> = Object.entries(REGULASI_DOCS_BY_SLUG)
    .reduce<Record<string, RegulasiDoc>>((acc, [, doc]) => {
        if (doc.pdfPath) {
            const fileName = doc.pdfPath.split("/").pop() ?? "";
            if (fileName) {
                acc[fileName] = doc;
            }
        }

        (doc.fallbackPdfPaths ?? []).forEach((fallbackPath) => {
            const fallbackName = fallbackPath.split("/").pop() ?? "";
            if (fallbackName && !acc[fallbackName]) {
                acc[fallbackName] = doc;
            }
        });

        return acc;
    }, {});

export const REGULASI_DEFAULT_ORDER_FILE_NAMES: string[] = Object.values(REGULASI_DOCS_BY_SLUG)
    .flatMap((doc) => {
        if (!doc.pdfPath) {
            return [];
        }
        const fileName = doc.pdfPath.split("/").pop() ?? "";
        return fileName ? [fileName] : [];
    });

export function getRegulasiDocByFileName(fileName: string): RegulasiDoc | undefined {
    const key = String(fileName || "").trim();
    if (!key) {
        return undefined;
    }
    return REGULASI_DOCS_BY_FILE_NAME[key];
}
