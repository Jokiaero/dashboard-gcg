"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getRegulasiDocByFileName } from "@/lib/regulasiDocuments";

type DashboardRegulasiOrderResponse = {
    regulasiOrder?: string[];
};

type RegulasiDocumentItem = {
    name: string;
    url: string;
    modifiedAt?: string;
};

type RegulasiDocumentsResponse = {
    files?: RegulasiDocumentItem[];
};

type RegulasiCatalogItem = {
    fileName: string;
    openHref: string;
    title: string;
    subtitle: string;
};

function extractRegulasiNumber(value: string) {
    const text = String(value || "").toUpperCase();
    const match = text.match(/PER-\d+\/MBU\/\d+\/\d+/);
    return match?.[0] || "PERATURAN MENTERI";
}

function toCoverTopic(title: string, subtitle: string) {
    const source = String(subtitle || title || "").trim();
    return source.toUpperCase();
}

function normalizeRegulasiOrder(order: unknown): string[] {
    const source = Array.isArray(order) ? order : [];
    const seen = new Set<string>();
    const normalized: string[] = [];

    source.forEach((value) => {
        const fileName = String(value || "").trim();
        if (!fileName || seen.has(fileName)) {
            return;
        }
        seen.add(fileName);
        normalized.push(fileName);
    });

    return normalized;
}

function syncRegulasiOrderWithActiveFiles(currentOrder: string[], activeFileNames: string[]): string[] {
    const normalizedOrder = normalizeRegulasiOrder(currentOrder);
    const normalizedActive = normalizeRegulasiOrder(activeFileNames);
    const activeSet = new Set(normalizedActive);
    const synced = normalizedOrder.filter((name) => activeSet.has(name));

    normalizedActive.forEach((name) => {
        if (!synced.includes(name)) {
            synced.push(name);
        }
    });

    return synced;
}

function toDisplayTitleFromFileName(fileName: string) {
    return decodeURIComponent(String(fileName || ""))
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function toCatalogItem(file: RegulasiDocumentItem): RegulasiCatalogItem {
    const knownDoc = getRegulasiDocByFileName(file.name);
    return {
        fileName: file.name,
        openHref: file.url,
        title: knownDoc?.title || toDisplayTitleFromFileName(file.name) || file.name,
        subtitle: knownDoc?.subtitle || "Dokumen regulasi hasil unggahan admin",
    };
}

export default function RegulasiCatalogPage() {
    const { data: settingsData } = useQuery<DashboardRegulasiOrderResponse>({
        queryKey: ["dashboardSettingsRegulasiOrder"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/settings");
            if (!res.ok) return {};
            return res.json();
        },
        staleTime: 120_000,
    });

    const { data: docsData } = useQuery<RegulasiDocumentsResponse>({
        queryKey: ["regulasiDocumentsCatalogList"],
        queryFn: async () => {
            const res = await fetch("/api/admin/documents?category=regulasi");
            if (!res.ok) return { files: [] };
            return res.json();
        },
        staleTime: 60_000,
    });

    const regulasiEntries = useMemo(
        () => {
            const files = Array.isArray(docsData?.files) ? docsData.files : [];
            const fileNames = files.map((file) => file.name);
            const syncedOrder = syncRegulasiOrderWithActiveFiles(
                normalizeRegulasiOrder(settingsData?.regulasiOrder),
                fileNames
            );
            const fileMap = new Map(files.map((file) => [file.name, file]));

            return syncedOrder.flatMap((fileName) => {
                const file = fileMap.get(fileName);
                return file ? [toCatalogItem(file)] : [];
            });
        },
        [docsData?.files, settingsData?.regulasiOrder]
    );

    return (
        <div className="main-panel" style={{ width: "100%" }}>
            <div className="content-wrapper">
                <div className="page-header mb-3">
                    <div>
                        <h3 className="page-title mb-1" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                            Katalog Regulasi
                        </h3>
                        <p className="text-muted mb-0" style={{ fontSize: "0.86rem" }}>
                            Pilih cover dokumen untuk membuka regulasi. Upload dokumen hanya tersedia di Panel Admin.
                        </p>
                    </div>
                </div>

                {regulasiEntries.length === 0 && (
                    <div
                        style={{
                            border: "1px dashed #cbd5e1",
                            borderRadius: 10,
                            backgroundColor: "#f8fafc",
                            padding: "20px 16px",
                            color: "#64748b",
                            fontSize: 13,
                            marginBottom: 12,
                        }}
                    >
                        Belum ada file regulasi aktif. Upload dokumen dari Panel Admin agar muncul di katalog cover.
                    </div>
                )}

                <div className="row g-3 g-xl-4">
                    {regulasiEntries.map((item, index) => {
                        const numberLabel = extractRegulasiNumber(`${item.title} ${item.subtitle}`);
                        const topicLabel = toCoverTopic(item.title, item.subtitle);

                        return (
                        <div className="col-12 col-md-6 col-xl-4" key={item.fileName}>
                            <a
                                href={item.openHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-decoration-none"
                            >
                                <article
                                    className="card h-100 border-0"
                                    style={{
                                        borderRadius: 14,
                                        overflow: "hidden",
                                        boxShadow: "0 8px 22px rgba(15, 23, 42, 0.09)",
                                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                        cursor: "pointer",
                                        backgroundColor: "#ffffff",
                                    }}
                                >
                                    <div
                                        style={{
                                            padding: "14px 14px 10px",
                                            backgroundColor: "#f3f4f6",
                                        }}
                                    >
                                        <div
                                            style={{
                                                borderRadius: 2,
                                                border: "1px solid #d1d5db",
                                                backgroundColor: "#ffffff",
                                                aspectRatio: "210 / 297",
                                                position: "relative",
                                                padding: "14px 14px 12px",
                                                overflow: "hidden",
                                                pointerEvents: "none",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    position: "absolute",
                                                    top: 10,
                                                    right: 10,
                                                    border: "1px solid #111827",
                                                    padding: "1px 7px",
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    letterSpacing: 0.25,
                                                    color: "#111827",
                                                }}
                                            >
                                                DISTRIBUSI II
                                            </div>

                                            <div style={{ textAlign: "center", marginTop: 6 }}>
                                                <div
                                                    style={{
                                                        width: 38,
                                                        height: 38,
                                                        borderRadius: "50%",
                                                        margin: "0 auto 8px",
                                                        border: "1px solid #d4a857",
                                                        color: "#b45309",
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        fontFamily: "Georgia, Times New Roman, serif",
                                                    }}
                                                >
                                                    RI
                                                </div>
                                                <div
                                                    style={{
                                                        fontFamily: "Georgia, Times New Roman, serif",
                                                        fontSize: 9,
                                                        fontWeight: 700,
                                                        letterSpacing: 0.15,
                                                        color: "#b45309",
                                                        textTransform: "uppercase",
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    Menteri Badan Usaha Milik Negara
                                                </div>
                                                <div
                                                    style={{
                                                        fontFamily: "Georgia, Times New Roman, serif",
                                                        fontSize: 9,
                                                        fontWeight: 700,
                                                        letterSpacing: 0.15,
                                                        color: "#b45309",
                                                        textTransform: "uppercase",
                                                        lineHeight: 1.2,
                                                    }}
                                                >
                                                    Republik Indonesia
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    textAlign: "center",
                                                    marginTop: 30,
                                                    fontFamily: "Georgia, Times New Roman, serif",
                                                    color: "#111827",
                                                }}
                                            >
                                                <div style={{ fontSize: 11, fontWeight: 700 }}>SALINAN</div>
                                                <div
                                                    style={{
                                                        marginTop: 8,
                                                        fontSize: 10,
                                                        lineHeight: 1.45,
                                                        fontWeight: 700,
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    Peraturan Menteri Badan Usaha Milik Negara
                                                </div>
                                                <div
                                                    style={{
                                                        marginTop: 3,
                                                        fontSize: 11,
                                                        lineHeight: 1.45,
                                                        fontWeight: 700,
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    Nomor {numberLabel}
                                                </div>
                                                <div
                                                    style={{
                                                        marginTop: 6,
                                                        fontSize: 10,
                                                        lineHeight: 1.45,
                                                        fontWeight: 700,
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    Tentang
                                                </div>
                                                <div
                                                    style={{
                                                        marginTop: 3,
                                                        fontSize: 10,
                                                        lineHeight: 1.45,
                                                        fontWeight: 700,
                                                        textTransform: "uppercase",
                                                    }}
                                                >
                                                    {topicLabel}
                                                </div>
                                            </div>

                                            <div
                                                style={{
                                                    position: "absolute",
                                                    left: "50%",
                                                    top: "58%",
                                                    transform: "translate(-50%, -50%) rotate(-33deg)",
                                                    fontFamily: "Georgia, Times New Roman, serif",
                                                    fontSize: 38,
                                                    letterSpacing: 0.3,
                                                    color: "rgba(15, 23, 42, 0.09)",
                                                    fontWeight: 700,
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                jdih.bumn.go.id
                                            </div>

                                            <div
                                                style={{
                                                    position: "absolute",
                                                    left: 14,
                                                    right: 14,
                                                    bottom: 12,
                                                    fontFamily: "Georgia, Times New Roman, serif",
                                                    fontSize: 9,
                                                    lineHeight: 1.4,
                                                    color: "#111827",
                                                }}
                                            >
                                                <strong>Menimbang:</strong> bahwa ketentuan tata kelola BUMN perlu diselaraskan untuk mendukung
                                                pengelolaan korporasi yang lebih efektif dan akuntabel.
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-body" style={{ padding: "12px 14px 16px" }}>
                                        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: "#475569", fontWeight: 700 }}>
                                            {item.title}
                                        </p>
                                        <p style={{ margin: "4px 0 0", fontSize: 12, lineHeight: 1.45, color: "#64748b" }}>
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </article>
                            </a>
                        </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
