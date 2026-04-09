"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { KAJIAN_DEFAULT_ORDER_FILE_NAMES } from "@/lib/kajianDocuments";

type DashboardKajianOrderResponse = {
    kajianOrder?: string[];
};

type KajianDocumentItem = {
    name: string;
    url: string;
    thumbnailUrl?: string | null;
    modifiedAt?: string;
};

type KajianDocumentsResponse = {
    files?: KajianDocumentItem[];
};

type KajianCatalogItem = {
    fileName: string;
    openHref: string;
    title: string;
    subtitle: string;
    thumbnailHref?: string;
    isImage: boolean;
    previewHref: string;
};

const DEFAULT_KAJIAN_ORDER = [...KAJIAN_DEFAULT_ORDER_FILE_NAMES];

function toDisplayTitleFromFileName(fileName: string) {
    return decodeURIComponent(String(fileName || ""))
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isImageFile(fileName: string) {
    return /\.(png|jpe?g|webp|gif)$/i.test(fileName);
}

function appendVersion(url: string, token?: string) {
    const value = token || String(Date.now());
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}v=${encodeURIComponent(value)}`;
}

function normalizeKajianOrder(order: unknown): string[] {
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

function syncKajianOrderWithActiveFiles(currentOrder: string[], activeFileNames: string[]): string[] {
    const normalizedOrder = normalizeKajianOrder(currentOrder);
    const normalizedActive = normalizeKajianOrder(activeFileNames);
    const activeSet = new Set(normalizedActive);
    const synced = normalizedOrder.filter((name) => activeSet.has(name));

    normalizedActive.forEach((name) => {
        if (!synced.includes(name)) {
            synced.push(name);
        }
    });

    return synced;
}

function toCatalogItem(file: KajianDocumentItem): KajianCatalogItem {
    const isImage = isImageFile(file.name);
    return {
        fileName: file.name,
        openHref: file.url,
        title: toDisplayTitleFromFileName(file.name) || file.name,
        subtitle: "Dokumen kajian internal hasil unggahan admin",
        thumbnailHref: file.thumbnailUrl ? appendVersion(file.thumbnailUrl, file.modifiedAt) : undefined,
        isImage,
        previewHref: isImage
            ? file.url
            : `${file.url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`,
    };
}

export default function KajianInternal() {
    const { data: settingsData } = useQuery<DashboardKajianOrderResponse>({
        queryKey: ["dashboardSettingsKajianOrder"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/settings");
            if (!res.ok) return {};
            return res.json();
        },
        staleTime: 120_000,
    });

    const { data: docsData } = useQuery<KajianDocumentsResponse>({
        queryKey: ["kajianDocumentsCatalogList"],
        queryFn: async () => {
            const res = await fetch("/api/admin/documents?category=kajian");
            if (!res.ok) return { files: [] };
            return res.json();
        },
        staleTime: 60_000,
    });

    const kajianEntries = useMemo(() => {
        const files = Array.isArray(docsData?.files) ? docsData.files : [];
        const fileNames = files.map((file) => file.name);
        const settingsOrder = normalizeKajianOrder(settingsData?.kajianOrder);
        const orderSource = settingsOrder.length > 0 ? settingsOrder : DEFAULT_KAJIAN_ORDER;
        const syncedOrder = syncKajianOrderWithActiveFiles(orderSource, fileNames);
        const fileMap = new Map(files.map((file) => [file.name, file]));

        return syncedOrder.flatMap((fileName) => {
            const file = fileMap.get(fileName);
            return file ? [toCatalogItem(file)] : [];
        });
    }, [docsData?.files, settingsData?.kajianOrder]);

    return (
        <div className="main-panel" style={{ width: "100%" }}>
            <div className="content-wrapper">
                <div className="page-header mb-3">
                    <div>
                        <h3 className="page-title mb-1" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                            Katalog Kajian Internal GCG
                        </h3>
                        <p className="text-muted mb-0" style={{ fontSize: "0.86rem" }}>
                            Klik cover dokumen untuk membuka file.
                        </p>
                    </div>
                </div>

                {kajianEntries.length === 0 && (
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
                        Belum ada file kajian aktif. Upload dokumen melalui Panel Admin agar otomatis muncul di katalog ini.
                    </div>
                )}

                <div className="row g-2 g-lg-3">
                    {kajianEntries.map((item) => (
                        <div className="col-12 col-md-6 col-lg-4 col-xl-3" key={item.fileName}>
                            <a
                                href={item.openHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-decoration-none"
                            >
                                <article
                                    className="h-100"
                                    style={{
                                        borderRadius: 10,
                                        transition: "transform 0.2s ease, box-shadow 0.2s ease",
                                        cursor: "pointer",
                                    }}
                                >
                                    <div
                                        style={{
                                            borderRadius: 4,
                                            backgroundColor: "#e5e7eb",
                                            padding: 14,
                                            boxShadow: "0 8px 22px rgba(15, 23, 42, 0.09)",
                                        }}
                                    >
                                        <div
                                            style={{
                                                aspectRatio: "210 / 297",
                                                borderRadius: 3,
                                                overflow: "hidden",
                                                border: "1px solid #d1d5db",
                                                backgroundColor: "#ffffff",
                                            }}
                                        >
                                            {item.thumbnailHref ? (
                                                <img
                                                    src={item.thumbnailHref}
                                                    alt={item.title}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        display: "block",
                                                    }}
                                                />
                                            ) : item.isImage ? (
                                                <img
                                                    src={item.previewHref}
                                                    alt={item.title}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        objectFit: "cover",
                                                        display: "block",
                                                    }}
                                                />
                                            ) : (
                                                <iframe
                                                    src={item.previewHref}
                                                    title={`Preview ${item.title}`}
                                                    style={{
                                                        width: "100%",
                                                        height: "100%",
                                                        border: "none",
                                                        display: "block",
                                                        pointerEvents: "none",
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-center" style={{ padding: "8px 4px 0" }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: 14,
                                                lineHeight: 1.15,
                                                color: "#111827",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {item.title}
                                        </p>
                                        <p style={{ margin: "4px 0 0", fontSize: 11, lineHeight: 1.3, color: "#6b7280" }}>
                                            {item.subtitle}
                                        </p>
                                    </div>
                                </article>
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
