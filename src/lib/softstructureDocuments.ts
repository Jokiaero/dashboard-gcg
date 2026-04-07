export type SoftstructureDoc = {
    title: string;
    subtitle: string;
};

export const SOFTSTRUCTURE_DOCS_BY_FILE_NAME: Record<string, SoftstructureDoc> = {
    "pedoman-gcg-27-mei-2024-signed.pdf": {
        title: "Pedoman GCG",
        subtitle: "Pedoman Tata Kelola Perusahaan yang Baik (Good Corporate Governance)",
    },
    "pedoman-etika-perilaku-coc-2024-signed.pdf": {
        title: "Pedoman Etika Perilaku (CoC)",
        subtitle: "Pedoman Etika dan Perilaku (Code of Conduct) Tahun 2024",
    },
    "pedoman-pengelolaan-informasi-2019-signed.pdf": {
        title: "Pedoman Pengelolaan Informasi",
        subtitle: "Pedoman Pengelolaan Informasi Tahun 2019",
    },
    "pedoman-benturan-kepentingan-2022-signed.pdf": {
        title: "Pedoman Benturan Kepentingan",
        subtitle: "Pedoman Benturan Kepentingan Tahun 2022",
    },
    "pedoman-pengendalian-gratifikasi-2025-signed.pdf": {
        title: "Pedoman Pengendalian Gratifikasi",
        subtitle: "Pedoman Pengendalian Gratifikasi Tahun 2025",
    },
};

export const SOFTSTRUCTURE_DEFAULT_ORDER_FILE_NAMES = Object.keys(SOFTSTRUCTURE_DOCS_BY_FILE_NAME);

export function getSoftstructureDocByFileName(fileName: string): SoftstructureDoc | undefined {
    const key = String(fileName || "").trim();
    if (!key) {
        return undefined;
    }
    return SOFTSTRUCTURE_DOCS_BY_FILE_NAME[key];
}
