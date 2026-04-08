"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { SOFTSTRUCTURE_DEFAULT_ORDER_FILE_NAMES, getSoftstructureDocByFileName } from "@/lib/softstructureDocuments";

type DashboardSoftstructureOrderResponse = {
    softstructureOrder?: string[];
};

type SoftstructureDocumentItem = {
    name: string;
    url: string;
    thumbnailUrl?: string | null;
    modifiedAt?: string;
};

type SoftstructureDocumentsResponse = {
    files?: SoftstructureDocumentItem[];
};

type SoftstructureCatalogItem = {
    fileName: string;
    openHref: string;
    title: string;
    subtitle: string;
    thumbnailHref?: string;
    isImage: boolean;
    previewHref: string;
};

const DEFAULT_SOFTSTRUCTURE_ORDER = [...SOFTSTRUCTURE_DEFAULT_ORDER_FILE_NAMES];

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

function normalizeSoftstructureOrder(order: unknown): string[] {
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

function syncSoftstructureOrderWithActiveFiles(currentOrder: string[], activeFileNames: string[]): string[] {
    const normalizedOrder = normalizeSoftstructureOrder(currentOrder);
    const normalizedActive = normalizeSoftstructureOrder(activeFileNames);
    const activeSet = new Set(normalizedActive);
    const synced = normalizedOrder.filter((name) => activeSet.has(name));

    normalizedActive.forEach((name) => {
        if (!synced.includes(name)) {
            synced.push(name);
        }
    });

    return synced;
}

function toCatalogItem(file: SoftstructureDocumentItem): SoftstructureCatalogItem {
    const knownMeta = getSoftstructureDocByFileName(file.name);
    const isImage = isImageFile(file.name);

    return {
        fileName: file.name,
        openHref: file.url,
        title: knownMeta?.title || toDisplayTitleFromFileName(file.name) || file.name,
        subtitle: knownMeta?.subtitle || "Dokumen softstructure hasil unggahan admin",
        thumbnailHref: file.thumbnailUrl ? appendVersion(file.thumbnailUrl, file.modifiedAt) : undefined,
        isImage,
        previewHref: isImage
            ? file.url
            : `${file.url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`,
    };
}

export default function SoftstructureCatalogPage() {
    const { data: settingsData } = useQuery<DashboardSoftstructureOrderResponse>({
        queryKey: ["dashboardSettingsSoftstructureOrder"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/settings");
            if (!res.ok) return {};
            return res.json();
        },
        staleTime: 120_000,
    });

    const { data: docsData } = useQuery<SoftstructureDocumentsResponse>({
        queryKey: ["softstructureDocumentsCatalogList"],
        queryFn: async () => {
            const res = await fetch("/api/admin/documents?category=softstructure");
            if (!res.ok) return { files: [] };
            return res.json();
        },
        staleTime: 60_000,
    });

    const softstructureEntries = useMemo(() => {
        const files = Array.isArray(docsData?.files) ? docsData.files : [];
        const fileNames = files.map((file) => file.name);
        const settingsOrder = normalizeSoftstructureOrder(settingsData?.softstructureOrder);
        const orderSource = settingsOrder.length > 0 ? settingsOrder : DEFAULT_SOFTSTRUCTURE_ORDER;
        const syncedOrder = syncSoftstructureOrderWithActiveFiles(orderSource, fileNames);
        const fileMap = new Map(files.map((file) => [file.name, file]));

        return syncedOrder.flatMap((fileName) => {
            const file = fileMap.get(fileName);
            return file ? [toCatalogItem(file)] : [];
        });
    }, [docsData?.files, settingsData?.softstructureOrder]);

    return (
        <div className="main-panel" style={{ width: "100%" }}>
            <div className="content-wrapper">
                <div className="page-header mb-3">
                    <div>
                        <h3 className="page-title mb-1" style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                            Katalog Softstructure GCG
                        </h3>
                        <p className="text-muted mb-0" style={{ fontSize: "0.86rem" }}>
                            Klik cover dokumen untuk membuka file. Upload dokumen hanya tersedia di Panel Admin.
                        </p>
                    </div>
                </div>

                {softstructureEntries.length === 0 && (
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
                        Belum ada file softstructure aktif. Upload dokumen melalui Panel Admin agar otomatis muncul di katalog ini.
                    </div>
                )}

                <div className="row g-3 g-xl-4">
                    {softstructureEntries.map((item) => (
                        <div className="col-12 col-md-6 col-xl-4" key={item.fileName}>
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

                                    <div className="text-center" style={{ padding: "12px 8px 0" }}>
                                        <p
                                            style={{
                                                margin: 0,
                                                fontSize: 18,
                                                lineHeight: 1.15,
                                                color: "#111827",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {item.title}
                                        </p>
                                        <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.4, color: "#6b7280" }}>
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
