"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { REGULASI_DEFAULT_ORDER_FILE_NAMES, getRegulasiDocByFileName } from "@/lib/regulasiDocuments";
import { SOFTSTRUCTURE_DEFAULT_ORDER_FILE_NAMES, getSoftstructureDocByFileName } from "@/lib/softstructureDocuments";
import { KAJIAN_DEFAULT_ORDER_FILE_NAMES } from "@/lib/kajianDocuments";

// ─── Types ────────────────────────────────────────────────────────────────────
type DocFile = {
    name: string;
    url: string;
    size: number;
    type: string;
    category: string;
    modifiedAt: string;
};

type ViewMode = "active" | "recycle";

type Category = {
    id: string;
    label: string;
    icon: string;
    color: string;
    bg: string;
    desc: string;
};

type DashboardSettingsPayload = {
    dashboardTitle: string;
    dashboardSubtitle: string;
    kajian2025: string;
    kajian2024: string;
    isoNote: string;
    penghargaanNote: string;
    penghargaanUrl?: string;
    penghargaanUrls?: string[];
    regulasiOrder?: string[];
    softstructureOrder?: string[];
    kajianOrder?: string[];
    riskProfileSourceName?: string;
    gcgScores: Array<{ year: string; value: number }>;
};

type UploadApiResponse = {
    name?: string;
    category?: string;
    requestedCategory?: string;
    categoryAdjusted?: boolean;
};

const EMPTY_DOC_FILES: DocFile[] = [];

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
    { id: "regulasi",     label: "Regulasi",        icon: "icon-book",      color: "#1d4ed8", bg: "#dbeafe", desc: "PDF Peraturan Menteri & Regulasi" },
    { id: "softstructure",label: "Softstructure",   icon: "icon-layout",    color: "#0891b2", bg: "#cffafe", desc: "Pedoman GCG & Tata Kelola" },
    { id: "assessment",   label: "Assessment",      icon: "icon-bar-graph", color: "#7c3aed", bg: "#ede9fe", desc: "Sertifikat ISO & Assessment GCG" },
    { id: "pelaporan_wbs", label: "Pelaporan WBS", icon: "icon-pie-graph", color: "#2563eb", bg: "#dbeafe", desc: "Arsip laporan WBS (PDF/Excel)" },
    { id: "pelaporan_risiko", label: "Profil Risiko", icon: "icon-shield", color: "#d97706", bg: "#ffedd5", desc: "Dokumen laporan profil risiko" },
    { id: "pelaporan_penyuapan", label: "Monitoring Risiko", icon: "icon-bar-graph", color: "#c2410c", bg: "#ffedd5", desc: "Monitoring risiko penyuapan" },
    { id: "pelaporan_ppg", label: "Implementasi PPG", icon: "icon-paper", color: "#059669", bg: "#d1fae5", desc: "Laporan implementasi PPG ke KPK" },
    { id: "pelaporan_survey", label: "Survey Awareness", icon: "icon-check", color: "#4338ca", bg: "#e0e7ff", desc: "Laporan survey awareness GCG" },
    { id: "approval_kepatuhan", label: "Approval Kepatuhan", icon: "icon-check", color: "#0f766e", bg: "#ccfbf1", desc: "Data approval pernyataan kepatuhan" },
    { id: "kajian",       label: "Kajian",          icon: "icon-search",    color: "#059669", bg: "#d1fae5", desc: "Dokumen Kajian Internal" },
    { id: "penghargaan",  label: "Berita GCG",      icon: "icon-head",      color: "#b45309", bg: "#fef3c7", desc: "Arsip Berita dan Dokumentasi GCG" },
];

const DEFAULT_REGULASI_ORDER = [...REGULASI_DEFAULT_ORDER_FILE_NAMES];
const DEFAULT_SOFTSTRUCTURE_ORDER = [...SOFTSTRUCTURE_DEFAULT_ORDER_FILE_NAMES];
const DEFAULT_KAJIAN_ORDER = [...KAJIAN_DEFAULT_ORDER_FILE_NAMES];

function normalizeRegulasiOrder(order: unknown): string[] {
    const input = Array.isArray(order) ? order : [];
    const seen = new Set<string>();
    const normalized: string[] = [];

    input.forEach((value) => {
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

function normalizeSoftstructureOrder(order: unknown): string[] {
    const input = Array.isArray(order) ? order : [];
    const seen = new Set<string>();
    const normalized: string[] = [];

    input.forEach((value) => {
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

function normalizeKajianOrder(order: unknown): string[] {
    const input = Array.isArray(order) ? order : [];
    const seen = new Set<string>();
    const normalized: string[] = [];

    input.forEach((value) => {
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

function areStringArraysEqual(left: string[], right: string[]): boolean {
    if (left.length !== right.length) {
        return false;
    }

    for (let i = 0; i < left.length; i += 1) {
        if (left[i] !== right[i]) {
            return false;
        }
    }

    return true;
}

function reorderItems(items: string[], fromIndex: number, toIndex: number): string[] {
    if (fromIndex === toIndex) {
        return [...items];
    }

    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
}

function toDisplayTitleFromFileName(fileName: string): string {
    const decoded = decodeURIComponent(String(fileName || ""));
    return decoded
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getRegulasiLabelByFileName(fileName: string): string {
    return getRegulasiDocByFileName(fileName)?.title || toDisplayTitleFromFileName(fileName) || fileName;
}

function getSoftstructureLabelByFileName(fileName: string): string {
    return getSoftstructureDocByFileName(fileName)?.title || toDisplayTitleFromFileName(fileName) || fileName;
}

function getKajianLabelByFileName(fileName: string): string {
    return toDisplayTitleFromFileName(fileName) || fileName;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function buildReaderHref(fileUrl: string, fileName: string): string {
    const params = new URLSearchParams({
        file: String(fileUrl || ""),
        name: String(fileName || ""),
    });
    return `/file-reader?${params.toString()}`;
}

function isExcelFileName(fileName: string): boolean {
    const lower = String(fileName || "").toLowerCase();
    return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Terjadi kesalahan yang tidak diketahui";
}

function getCategoryLabelById(categoryId: string): string {
    return CATEGORIES.find((item) => item.id === categoryId)?.label || categoryId;
}

function buildAutoCategoryNotice(rows: Array<{ to: string }>): string {
    if (rows.length === 0) {
        return "";
    }

    const uniqueDestinations = Array.from(new Set(rows.map((row) => row.to)));
    const destinationLabels = uniqueDestinations.map(getCategoryLabelById);
    return ` Kategori otomatis disesuaikan ke: ${destinationLabels.join(", ")}.`;
}

function CoverOrderList({
    title,
    borderColor,
    bg,
    titleColor,
    items,
    getLabel,
    onReorder,
    disabled,
    isSaving,
}: {
    title: string;
    borderColor: string;
    bg: string;
    titleColor: string;
    items: string[];
    getLabel: (fileName: string) => string;
    onReorder?: (nextOrder: string[]) => void;
    disabled?: boolean;
    isSaving?: boolean;
}) {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const isDragDisabled = Boolean(disabled || !onReorder);

    const handleDropAt = (targetIndex: number) => {
        if (isDragDisabled || draggedIndex === null) {
            return;
        }

        const nextOrder = reorderItems(items, draggedIndex, targetIndex);
        const changed = !areStringArraysEqual(items, nextOrder);
        setDraggedIndex(null);
        setOverIndex(null);

        if (changed) {
            onReorder?.(nextOrder);
        }
    };

    return (
        <div
            style={{
                marginTop: 10,
                padding: "10px 12px",
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                backgroundColor: bg,
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                }}
            >
                <div style={{ fontSize: 12, fontWeight: 700, color: titleColor }}>{title}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>
                    {isSaving ? "Menyimpan urutan..." : isDragDisabled ? "Drag tidak aktif" : "Drag item untuk ubah urutan"}
                </div>
            </div>
            {items.length === 0 ? (
                <div style={{ fontSize: 11, color: "#64748b" }}>Belum ada file aktif untuk ditampilkan pada urutan katalog.</div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((fileName, index) => (
                        <div
                            key={`${title}-${fileName}`}
                            draggable={!isDragDisabled}
                            onDragStart={(event) => {
                                if (isDragDisabled) {
                                    return;
                                }
                                setDraggedIndex(index);
                                setOverIndex(index);
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/plain", fileName);
                            }}
                            onDragOver={(event) => {
                                if (isDragDisabled) {
                                    return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                                event.dataTransfer.dropEffect = "move";
                                if (overIndex !== index) {
                                    setOverIndex(index);
                                }
                            }}
                            onDrop={(event) => {
                                if (isDragDisabled) {
                                    return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                                handleDropAt(index);
                            }}
                            onDragEnd={() => {
                                setDraggedIndex(null);
                                setOverIndex(null);
                            }}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                backgroundColor: draggedIndex === index ? "#f8fafc" : "#fff",
                                border:
                                    overIndex === index && draggedIndex !== null && draggedIndex !== index
                                        ? `1px dashed ${titleColor}`
                                        : "1px solid #e2e8f0",
                                borderRadius: 7,
                                padding: "7px 9px",
                                cursor: isDragDisabled ? "default" : "grab",
                                opacity: draggedIndex === index ? 0.62 : 1,
                                transition: "border-color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease",
                            }}
                        >
                            <div style={{ fontSize: 13, color: "#94a3b8", userSelect: "none" }}>
                                <i className="icon-menu"></i>
                            </div>
                            <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600 }}>
                                {index + 1}. {getLabel(fileName)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function AdminContentPanel() {
    const [activeCategory, setActiveCategory] = useState<string>("regulasi");
    const [viewMode, setViewMode] = useState<ViewMode>("active");
    const [uploadTargetName, setUploadTargetName] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadingTotal, setUploadingTotal] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [regulasiOrderDraft, setRegulasiOrderDraft] = useState<string[]>(DEFAULT_REGULASI_ORDER);
    const [softstructureOrderDraft, setSoftstructureOrderDraft] = useState<string[]>(DEFAULT_SOFTSTRUCTURE_ORDER);
    const [kajianOrderDraft, setKajianOrderDraft] = useState<string[]>(DEFAULT_KAJIAN_ORDER);
    const [riskProfileSourceDraft, setRiskProfileSourceDraft] = useState("");
    const [confirmDelete, setConfirmDelete] = useState<DocFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const activeCat = CATEGORIES.find((c) => c.id === activeCategory)!;
    const isRegulasiCategory = activeCategory === "regulasi";
    const isSoftstructureCategory = activeCategory === "softstructure";
    const isKajianCategory = activeCategory === "kajian";
    const isRiskProfileCategory = activeCategory === "pelaporan_risiko";
    const isPenghargaanCategory = activeCategory === "penghargaan";
    const isPelaporanCategory = [
        "pelaporan_wbs",
        "pelaporan_risiko",
        "pelaporan_penyuapan",
        "pelaporan_ppg",
        "pelaporan_survey",
        "approval_kepatuhan",
    ].includes(activeCategory);
    const needsExcelStatsCategory = [
        "pelaporan_wbs",
        "pelaporan_risiko",
        "pelaporan_penyuapan",
        "pelaporan_ppg",
        "pelaporan_survey",
        "approval_kepatuhan",
        "assessment",
    ].includes(activeCategory);

    const { data: dashboardSettings } = useQuery<DashboardSettingsPayload>({
        queryKey: ["dashboardSettingsAdminContentPenghargaan"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/settings");
            if (!res.ok) {
                throw new Error("Gagal memuat pengaturan dashboard");
            }
            return res.json();
        },
        staleTime: 120_000,
        refetchOnWindowFocus: false,
    });

    // ── Fetch files ──────────────────────────────────────────────────────────
    const { data, isLoading } = useQuery<{ files: DocFile[] }>({
        queryKey: ["adminDocs", activeCategory, viewMode],
        queryFn: async () => {
            const res = await fetch(`/api/admin/documents?category=${activeCategory}&deleted=${viewMode === "recycle" ? "1" : "0"}`);
            if (!res.ok) throw new Error("Gagal memuat dokumen");
            return res.json();
        },
    });

    const files = data?.files ?? EMPTY_DOC_FILES;
    const riskProfileExcelFiles = isRiskProfileCategory && viewMode === "active"
        ? files.filter((file) => isExcelFileName(file.name))
        : EMPTY_DOC_FILES;

    const invalidateCategoryLists = () => {
        queryClient.invalidateQueries({ queryKey: ["adminDocs", activeCategory, "active"] });
        queryClient.invalidateQueries({ queryKey: ["adminDocs", activeCategory, "recycle"] });
    };

    const invalidatePenghargaanPublicData = () => {
        queryClient.invalidateQueries({ queryKey: ["penghargaanDocumentsList"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsPenghargaanPage"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsAdminContentPenghargaan"] });
    };

    const invalidateRegulasiPublicData = () => {
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsRegulasiOrder"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsAdminContentPenghargaan"] });
    };

    const invalidateSoftstructurePublicData = () => {
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsSoftstructureOrder"] });
        queryClient.invalidateQueries({ queryKey: ["softstructureDocumentsCatalogList"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsAdminContentPenghargaan"] });
    };

    const invalidateKajianPublicData = () => {
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsKajianOrder"] });
        queryClient.invalidateQueries({ queryKey: ["kajianDocumentsCatalogList"] });
        queryClient.invalidateQueries({ queryKey: ["dashboardSettingsAdminContentPenghargaan"] });
    };

    const buildDashboardPayload = (options?: {
        overrideRegulasiOrder?: string[];
        overrideSoftstructureOrder?: string[];
        overrideKajianOrder?: string[];
        overrideRiskProfileSourceName?: string;
    }): DashboardSettingsPayload => {
        if (!dashboardSettings) {
            throw new Error("Pengaturan dashboard belum siap");
        }

        const finalPenghargaanNote = String(dashboardSettings.penghargaanNote || "");
        const finalPenghargaanUrls = (
            Array.isArray(dashboardSettings.penghargaanUrls)
                ? dashboardSettings.penghargaanUrls
                : [String(dashboardSettings.penghargaanUrl || "")]
        ).map((url) => String(url || "").trim());
        const legacyFirstUrl = finalPenghargaanUrls.find((url) => Boolean(url)) || "";
        const finalRegulasiOrder = normalizeRegulasiOrder(
            Array.isArray(options?.overrideRegulasiOrder) ? options?.overrideRegulasiOrder : regulasiOrderDraft
        );
        const finalSoftstructureOrder = normalizeSoftstructureOrder(
            Array.isArray(options?.overrideSoftstructureOrder) ? options?.overrideSoftstructureOrder : softstructureOrderDraft
        );
        const finalKajianOrder = normalizeKajianOrder(
            Array.isArray(options?.overrideKajianOrder) ? options?.overrideKajianOrder : kajianOrderDraft
        );
        const finalRiskProfileSourceName = String(
            options?.overrideRiskProfileSourceName ?? dashboardSettings.riskProfileSourceName ?? ""
        ).trim();

        return {
            dashboardTitle: dashboardSettings.dashboardTitle,
            dashboardSubtitle: dashboardSettings.dashboardSubtitle,
            kajian2025: dashboardSettings.kajian2025,
            kajian2024: dashboardSettings.kajian2024,
            isoNote: dashboardSettings.isoNote,
            penghargaanNote: finalPenghargaanNote,
            penghargaanUrl: legacyFirstUrl,
            penghargaanUrls: finalPenghargaanUrls,
            regulasiOrder: finalRegulasiOrder,
            softstructureOrder: finalSoftstructureOrder,
            kajianOrder: finalKajianOrder,
            riskProfileSourceName: finalRiskProfileSourceName,
            gcgScores: Array.isArray(dashboardSettings.gcgScores) ? dashboardSettings.gcgScores : [],
        };
    };

    useEffect(() => {
        const fromSettings = normalizeRegulasiOrder(dashboardSettings?.regulasiOrder);
        setRegulasiOrderDraft(fromSettings.length > 0 ? fromSettings : [...DEFAULT_REGULASI_ORDER]);
    }, [dashboardSettings?.regulasiOrder]);

    useEffect(() => {
        const fromSettings = normalizeSoftstructureOrder(dashboardSettings?.softstructureOrder);
        setSoftstructureOrderDraft(fromSettings.length > 0 ? fromSettings : [...DEFAULT_SOFTSTRUCTURE_ORDER]);
    }, [dashboardSettings?.softstructureOrder]);

    useEffect(() => {
        const fromSettings = normalizeKajianOrder(dashboardSettings?.kajianOrder);
        setKajianOrderDraft(fromSettings.length > 0 ? fromSettings : [...DEFAULT_KAJIAN_ORDER]);
    }, [dashboardSettings?.kajianOrder]);

    useEffect(() => {
        setRiskProfileSourceDraft(String(dashboardSettings?.riskProfileSourceName || "").trim());
    }, [dashboardSettings?.riskProfileSourceName]);

    useEffect(() => {
        if (!isRiskProfileCategory || viewMode !== "active") {
            return;
        }

        const hasCurrent = riskProfileExcelFiles.some((file) => file.name === riskProfileSourceDraft);
        if (!hasCurrent) {
            setRiskProfileSourceDraft(riskProfileExcelFiles[0]?.name || "");
        }
    }, [isRiskProfileCategory, riskProfileExcelFiles, riskProfileSourceDraft, viewMode]);

    useEffect(() => {
        if (!isRegulasiCategory || viewMode !== "active") {
            return;
        }

        const activeRegulasiFileNames = files.map((file) => file.name);
        setRegulasiOrderDraft((prev) => {
            const next = syncRegulasiOrderWithActiveFiles(prev, activeRegulasiFileNames);
            return areStringArraysEqual(prev, next) ? prev : next;
        });
    }, [files, isRegulasiCategory, viewMode]);

    useEffect(() => {
        if (!isSoftstructureCategory || viewMode !== "active") {
            return;
        }

        const activeSoftstructureFileNames = files.map((file) => file.name);
        setSoftstructureOrderDraft((prev) => {
            const next = syncSoftstructureOrderWithActiveFiles(prev, activeSoftstructureFileNames);
            return areStringArraysEqual(prev, next) ? prev : next;
        });
    }, [files, isSoftstructureCategory, viewMode]);

    useEffect(() => {
        if (!isKajianCategory || viewMode !== "active") {
            return;
        }

        const activeKajianFileNames = files.map((file) => file.name);
        setKajianOrderDraft((prev) => {
            const next = syncKajianOrderWithActiveFiles(prev, activeKajianFileNames);
            return areStringArraysEqual(prev, next) ? prev : next;
        });
    }, [files, isKajianCategory, viewMode]);

    const saveRegulasiOrderMutation = useMutation({
        mutationFn: async (orderInput?: string[]) => {
            const syncedOrder = syncRegulasiOrderWithActiveFiles(
                Array.isArray(orderInput) ? orderInput : regulasiOrderDraft,
                files.map((file) => file.name)
            );
            const payload = buildDashboardPayload({ overrideRegulasiOrder: syncedOrder });
            const res = await fetch("/api/dashboard/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal menyimpan urutan regulasi");
            return { json, syncedOrder };
        },
        onSuccess: (data) => {
            if (Array.isArray(data?.syncedOrder)) {
                setRegulasiOrderDraft(data.syncedOrder);
            }
            invalidateRegulasiPublicData();
            setUploadStatus({ ok: true, msg: "✓ Urutan cover regulasi berhasil diperbarui." });
        },
        onError: (error: unknown) => {
            setUploadStatus({ ok: false, msg: `✗ ${getErrorMessage(error)}` });
        },
    });

    const saveSoftstructureOrderMutation = useMutation({
        mutationFn: async (orderInput?: string[]) => {
            const syncedOrder = syncSoftstructureOrderWithActiveFiles(
                Array.isArray(orderInput) ? orderInput : softstructureOrderDraft,
                files.map((file) => file.name)
            );
            const payload = buildDashboardPayload({ overrideSoftstructureOrder: syncedOrder });
            const res = await fetch("/api/dashboard/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal menyimpan urutan softstructure");
            return { json, syncedOrder };
        },
        onSuccess: (data) => {
            if (Array.isArray(data?.syncedOrder)) {
                setSoftstructureOrderDraft(data.syncedOrder);
            }
            invalidateSoftstructurePublicData();
            setUploadStatus({ ok: true, msg: "✓ Urutan cover softstructure berhasil diperbarui." });
        },
        onError: (error: unknown) => {
            setUploadStatus({ ok: false, msg: `✗ ${getErrorMessage(error)}` });
        },
    });

    const saveKajianOrderMutation = useMutation({
        mutationFn: async (orderInput?: string[]) => {
            const syncedOrder = syncKajianOrderWithActiveFiles(
                Array.isArray(orderInput) ? orderInput : kajianOrderDraft,
                files.map((file) => file.name)
            );
            const payload = buildDashboardPayload({ overrideKajianOrder: syncedOrder });
            const res = await fetch("/api/dashboard/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal menyimpan urutan kajian");
            return { json, syncedOrder };
        },
        onSuccess: (data) => {
            if (Array.isArray(data?.syncedOrder)) {
                setKajianOrderDraft(data.syncedOrder);
            }
            invalidateKajianPublicData();
            setUploadStatus({ ok: true, msg: "✓ Urutan cover kajian berhasil diperbarui." });
        },
        onError: (error: unknown) => {
            setUploadStatus({ ok: false, msg: `✗ ${getErrorMessage(error)}` });
        },
    });

    const saveRiskProfileSourceMutation = useMutation({
        mutationFn: async (sourceNameInput?: string) => {
            const sourceName = String(sourceNameInput ?? riskProfileSourceDraft ?? "").trim();
            const payload = buildDashboardPayload({ overrideRiskProfileSourceName: sourceName });
            const res = await fetch("/api/dashboard/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal menyimpan sumber data profil risiko");
            return { json, sourceName };
        },
        onSuccess: async (data) => {
            setRiskProfileSourceDraft(String(data?.sourceName || "").trim());
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["dashboardSettingsAdminContentPenghargaan"] }),
                queryClient.invalidateQueries({ queryKey: ["dashboardSettings"] }),
                queryClient.invalidateQueries({ queryKey: ["riskProfileData"] }),
            ]);
            setUploadStatus({ ok: true, msg: "✓ Sumber data Laporan Profil Risiko berhasil diperbarui." });
        },
        onError: (error: unknown) => {
            setUploadStatus({ ok: false, msg: `✗ ${getErrorMessage(error)}` });
        },
    });

    const handleRegulasiOrderReorder = (nextOrder: string[]) => {
        if (!dashboardSettings) {
            return;
        }

        const syncedOrder = syncRegulasiOrderWithActiveFiles(nextOrder, files.map((file) => file.name));
        setRegulasiOrderDraft(syncedOrder);
        saveRegulasiOrderMutation.mutate(syncedOrder);
    };

    const handleSoftstructureOrderReorder = (nextOrder: string[]) => {
        if (!dashboardSettings) {
            return;
        }

        const syncedOrder = syncSoftstructureOrderWithActiveFiles(nextOrder, files.map((file) => file.name));
        setSoftstructureOrderDraft(syncedOrder);
        saveSoftstructureOrderMutation.mutate(syncedOrder);
    };

    const handleKajianOrderReorder = (nextOrder: string[]) => {
        if (!dashboardSettings) {
            return;
        }

        const syncedOrder = syncKajianOrderWithActiveFiles(nextOrder, files.map((file) => file.name));
        setKajianOrderDraft(syncedOrder);
        saveKajianOrderMutation.mutate(syncedOrder);
    };

    // ── Delete ───────────────────────────────────────────────────────────────
    const deleteMutation = useMutation({
        mutationFn: async (file: DocFile) => {
            const res = await fetch("/api/admin/documents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: file.category, name: file.name }),
            });
            if (!res.ok) throw new Error("Gagal menghapus file");
        },
        onSuccess: (_data, file: DocFile) => {
            invalidateCategoryLists();
            setConfirmDelete(null);
            setViewMode("active");
            if (file.category === "penghargaan") {
                invalidatePenghargaanPublicData();
            }
            if (file.category === "kajian") {
                invalidateKajianPublicData();
            }
            if (file.category === "pelaporan_risiko") {
                queryClient.invalidateQueries({ queryKey: ["riskProfileData"] });
            }
        },
    });

    const handleQuickUpdate = (file: DocFile) => {
        setUploadTargetName(file.name);
        setViewMode("active");
        setUploadStatus({ ok: true, msg: `✓ Update siap untuk file "${file.name}". Pilih file pengganti.` });
        fileInputRef.current?.click();
    };

    async function uploadSingleFile(file: File, category: string, targetName?: string): Promise<UploadApiResponse> {
        const form = new FormData();
        form.append("file", file);
        form.append("category", category);
        if (targetName) {
            form.append("targetName", targetName);
        }

        const res = await fetch("/api/admin/upload", { method: "POST", body: form });
        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error || "Upload gagal");
        }
        return json as UploadApiResponse;
    }

    // ── Upload ───────────────────────────────────────────────────────────────
    const handleUpload = async (selectedFiles: File[]) => {
        if (selectedFiles.length === 0) {
            return;
        }

        const targetName = uploadTargetName.trim();
        const isUpdate = Boolean(targetName);

        if (isUpdate && selectedFiles.length > 1) {
            setUploadStatus({ ok: false, msg: "✗ Mode update hanya bisa untuk 1 file. Hapus Nama File Target jika ingin upload banyak file sekaligus." });
            return;
        }

        setUploading(true);
        setUploadingTotal(selectedFiles.length);
        setUploadStatus(null);

        const uploadedNames: string[] = [];
        const failedUploads: Array<{ name: string; error: string }> = [];
        const adjustedCategories: Array<{ from: string; to: string }> = [];

        try {
            for (const file of selectedFiles) {
                try {
                    const json = await uploadSingleFile(file, activeCategory, targetName || undefined);
                    const uploadedName = String(json?.name || "").trim();
                    if (uploadedName) {
                        uploadedNames.push(uploadedName);
                    }

                    const requestedCategory = String(json?.requestedCategory || activeCategory || "").trim();
                    const resolvedCategory = String(json?.category || activeCategory || "").trim();
                    if (json?.categoryAdjusted && requestedCategory && resolvedCategory && requestedCategory !== resolvedCategory) {
                        adjustedCategories.push({ from: requestedCategory, to: resolvedCategory });
                    }
                } catch (error: unknown) {
                    failedUploads.push({
                        name: file.name,
                        error: getErrorMessage(error),
                    });
                }
            }

            if (uploadedNames.length > 0) {
                setUploadTargetName("");
                setViewMode("active");
                invalidateCategoryLists();

                Array.from(new Set(adjustedCategories.map((row) => row.to))).forEach((categoryId) => {
                    queryClient.invalidateQueries({ queryKey: ["adminDocs", categoryId, "active"] });
                    queryClient.invalidateQueries({ queryKey: ["adminDocs", categoryId, "recycle"] });
                });

                const mergedActiveNames = [...files.map((item) => item.name), ...uploadedNames];

                if (activeCategory === "regulasi" && dashboardSettings) {
                    const syncedOrder = syncRegulasiOrderWithActiveFiles(
                        [...regulasiOrderDraft, ...uploadedNames],
                        mergedActiveNames
                    );
                    setRegulasiOrderDraft(syncedOrder);
                    saveRegulasiOrderMutation.mutate(syncedOrder);
                }

                if (activeCategory === "softstructure" && dashboardSettings) {
                    const syncedOrder = syncSoftstructureOrderWithActiveFiles(
                        [...softstructureOrderDraft, ...uploadedNames],
                        mergedActiveNames
                    );
                    setSoftstructureOrderDraft(syncedOrder);
                    saveSoftstructureOrderMutation.mutate(syncedOrder);
                }

                if (activeCategory === "kajian" && dashboardSettings) {
                    const syncedOrder = syncKajianOrderWithActiveFiles(
                        [...kajianOrderDraft, ...uploadedNames],
                        mergedActiveNames
                    );
                    setKajianOrderDraft(syncedOrder);
                    saveKajianOrderMutation.mutate(syncedOrder);
                }

                if (activeCategory === "kajian") {
                    invalidateKajianPublicData();
                }
                if (activeCategory === "penghargaan") {
                    invalidatePenghargaanPublicData();
                }
                if (activeCategory === "pelaporan_risiko") {
                    queryClient.invalidateQueries({ queryKey: ["riskProfileData"] });
                }
            }

            if (failedUploads.length === 0) {
                const autoCategoryNotice = buildAutoCategoryNotice(adjustedCategories);
                if (isUpdate) {
                    const updatedName = uploadedNames[0] || selectedFiles[0]?.name || "file";
                    setUploadStatus({ ok: true, msg: `✓ Update berhasil. File "${updatedName}" telah diperbarui.${autoCategoryNotice}` });
                } else if (uploadedNames.length === 1) {
                    setUploadStatus({ ok: true, msg: `✓ Create berhasil. File "${uploadedNames[0]}" telah ditambahkan.${autoCategoryNotice}` });
                } else {
                    setUploadStatus({ ok: true, msg: `✓ Upload batch berhasil. ${uploadedNames.length} file ditambahkan.${autoCategoryNotice}` });
                }
            } else if (uploadedNames.length > 0) {
                const failedPreview = failedUploads.slice(0, 2).map((row) => row.name).join(", ");
                const suffix = failedUploads.length > 2 ? ` dan ${failedUploads.length - 2} file lainnya` : "";
                const autoCategoryNotice = buildAutoCategoryNotice(adjustedCategories);
                setUploadStatus({
                    ok: false,
                    msg: `✗ Upload batch selesai sebagian: ${uploadedNames.length} sukses, ${failedUploads.length} gagal (${failedPreview}${suffix}).${autoCategoryNotice}`,
                });
            } else {
                const firstError = failedUploads[0]?.error || "Upload gagal";
                setUploadStatus({ ok: false, msg: `✗ Semua upload gagal. ${firstError}` });
            }
        } catch (error: unknown) {
            setUploadStatus({ ok: false, msg: `✗ ${getErrorMessage(error)}` });
        } finally {
            setUploading(false);
            setUploadingTotal(0);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pickedFiles = Array.from(e.target.files ?? []);
        if (pickedFiles.length > 0) {
            void handleUpload(pickedFiles);
        }
        e.target.value = "";
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files ?? []);
        if (droppedFiles.length > 0) {
            void handleUpload(droppedFiles);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };
    const onDragLeave = () => setIsDragging(false);
    const acceptedExtensions = isRegulasiCategory
        ? ".pdf"
        : isPelaporanCategory
            ? ".pdf,.xlsx,.xls"
            : ".pdf,.png,.jpg,.jpeg,.xlsx,.xls";

    const uploadTargetPlaceholder = isRegulasiCategory
        ? "contoh: peraturan-baru-2026 (isi jika update file lama)"
        : isPelaporanCategory
            ? "contoh: laporan-wbs-2026.xlsx (isi jika update file lama)"
            : "contoh: sertifikat-iso-2025 (isi jika update file lama)";

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ── Header ───────────────────────────────────────────────────── */}
            <div
                style={{
                    background: "linear-gradient(135deg, #1a3a2a 0%, #2b4c3d 100%)",
                    borderRadius: 10,
                    padding: "18px 24px",
                    boxShadow: "0 4px 15px rgba(43,76,61,0.25)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                }}
            >
                <div>
                    <h4 style={{ color: "#fff", fontWeight: 800, marginBottom: 4, fontSize: "1.1rem" }}>
                        Panel Admin — Manajemen Konten
                    </h4>
                    <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 0 }}>
                        Form terpadu untuk create, update, dan delete dokumen pada seluruh kategori
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Link
                        href="/admin/recycle"
                        style={{
                            backgroundColor: "rgba(255,255,255,0.95)",
                            color: "#1f2937",
                            border: "1px solid rgba(255,255,255,0.5)",
                            padding: "7px 16px",
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                        }}
                    >
                        Recycle
                    </Link>
                    <Link
                        href="/admin/users"
                        style={{
                            backgroundColor: "rgba(255,255,255,0.95)",
                            color: "#1f2937",
                            border: "1px solid rgba(255,255,255,0.5)",
                            padding: "7px 16px",
                            borderRadius: 7,
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                        }}
                    >
                        Kelola Pengguna
                    </Link>
                </div>
            </div>

            <div className="row g-3">
                {/* ── Left: Category selector ──────────────────────────────── */}
                <div className="col-lg-3">
                    <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                        <div className="card-body p-3">
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", letterSpacing: "0.5px", marginBottom: 10 }}>
                                Kategori Dokumen
                            </div>
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setActiveCategory(cat.id);
                                        setViewMode("active");
                                        setUploadStatus(null);
                                        setConfirmDelete(null);
                                        setUploadTargetName("");
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 10,
                                        width: "100%",
                                        padding: "10px 12px",
                                        borderRadius: 8,
                                        border: activeCategory === cat.id ? `2px solid ${cat.color}` : "2px solid transparent",
                                        backgroundColor: activeCategory === cat.id ? cat.bg : "transparent",
                                        cursor: "pointer",
                                        marginBottom: 4,
                                        textAlign: "left",
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <div style={{ width: 32, height: 32, borderRadius: 7, backgroundColor: cat.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                        <i className={cat.icon} style={{ color: cat.color, fontSize: 14 }}></i>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: activeCategory === cat.id ? cat.color : "#1e293b" }}>{cat.label}</div>
                                        <div style={{ fontSize: 10, color: "#94a3b8" }}>{cat.desc}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Right: Upload + File list ────────────────────────────── */}
                <div className="col-lg-9">
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                        {/* Upload Zone */}
                        <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                            <div className="card-body p-4">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                                        Upload / Update pada Kategori: <span style={{ color: activeCat.color }}>{activeCat.label}</span>
                                    </div>
                                </div>
                                <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>
                                    Isi Nama File Target jika ingin update file lama. Kosongkan jika ingin create file baru.
                                </div>

                                <div style={{ marginBottom: 12 }}>
                                    <label style={{ fontSize: 12, fontWeight: 600, color: "#64748b", display: "block", marginBottom: 4 }}>
                                        Nama File Target (opsional untuk update)
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder={uploadTargetPlaceholder}
                                        value={uploadTargetName}
                                        onChange={(e) => setUploadTargetName(e.target.value)}
                                        style={{ maxWidth: 520, borderRadius: 6 }}
                                    />
                                </div>

                                <div
                                    onDrop={onDrop}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${isDragging ? activeCat.color : "#cbd5e1"}`,
                                        borderRadius: 10,
                                        padding: "32px 24px",
                                        textAlign: "center",
                                        backgroundColor: isDragging ? activeCat.bg : "#f8fafc",
                                        cursor: uploading ? "not-allowed" : "pointer",
                                        transition: "all 0.2s",
                                        opacity: uploading ? 0.6 : 1,
                                    }}
                                >
                                    {uploading ? (
                                        <div>
                                            <div className="spinner-border spinner-border-sm mb-2" style={{ color: activeCat.color }}></div>
                                            <div style={{ fontSize: 13, color: "#64748b" }}>
                                                {uploadingTotal > 1 ? `Memproses ${uploadingTotal} file...` : "Memproses upload..."}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <i className="ti-cloud-up" style={{ fontSize: 32, color: activeCat.color, display: "block", marginBottom: 8 }}></i>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                                                Drag & drop file di sini
                                            </div>
                                            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>
                                                {uploadTargetName.trim()
                                                    ? "Mode update: pilih 1 file pengganti"
                                                    : isRegulasiCategory
                                                        ? "atau klik untuk pilih 1+ file • PDF • Maks 20MB / file"
                                                        : isPelaporanCategory
                                                            ? "atau klik untuk pilih 1+ file • PDF, XLSX • Maks 20MB / file"
                                                            : "atau klik untuk pilih 1+ file • PDF, PNG, JPG, XLSX • Maks 20MB / file"}
                                            </div>
                                        </>
                                    )}
                                    <input ref={fileInputRef} type="file" style={{ display: "none" }} accept={acceptedExtensions} multiple={!uploadTargetName.trim()} onChange={onFileChange} />
                                </div>
                                <div style={{ marginTop: 10 }}>
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading}
                                        style={{
                                            border: `1px solid ${activeCat.color}`,
                                            color: activeCat.color,
                                            backgroundColor: "#fff",
                                            borderRadius: 6,
                                            padding: "6px 12px",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            cursor: uploading ? "not-allowed" : "pointer",
                                            opacity: uploading ? 0.7 : 1,
                                        }}
                                    >
                                        Pilih File
                                    </button>
                                </div>


                                {isRegulasiCategory && viewMode === "active" && (
                                    <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                                        Upload regulasi akan menambahkan file baru (atau memperbarui jika nama file sama).
                                    </div>
                                )}

                                {isSoftstructureCategory && viewMode === "active" && (
                                    <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                                        Upload softstructure akan menambahkan file baru (atau memperbarui jika nama file sama).
                                    </div>
                                )}

                                {isPenghargaanCategory && viewMode === "active" && (
                                    <div style={{ marginTop: 10, fontSize: 11, color: "#64748b" }}>
                                        Upload berita GCG akan menambahkan file baru (atau memperbarui jika nama file sama).
                                    </div>
                                )}

                                {needsExcelStatsCategory && viewMode === "active" && (
                                    <div style={{ marginTop: 10, fontSize: 11, color: "#0f766e" }}>
                                        Catatan: kartu statistik dan grafik modul ini membaca file Excel (.xlsx/.xls). PDF tetap bisa diarsipkan sebagai dokumen pendukung.
                                    </div>
                                )}

                                {isRiskProfileCategory && viewMode === "active" && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            padding: "10px 12px",
                                            borderRadius: 8,
                                            border: "1px solid #fed7aa",
                                            backgroundColor: "#fffbeb",
                                        }}
                                    >
                                        <div style={{ fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 6 }}>
                                            Sumber Data Halaman Laporan Profil Risiko
                                        </div>
                                        <div style={{ fontSize: 11, color: "#78350f", marginBottom: 8 }}>
                                            Pilih file Excel aktif yang akan dipakai pada halaman laporan publik.
                                        </div>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                            <select
                                                className="form-control form-control-sm"
                                                value={riskProfileSourceDraft}
                                                onChange={(event) => setRiskProfileSourceDraft(event.target.value)}
                                                disabled={riskProfileExcelFiles.length === 0 || saveRiskProfileSourceMutation.isPending}
                                                style={{ minWidth: 320, maxWidth: 620, borderRadius: 6 }}
                                            >
                                                {riskProfileExcelFiles.length === 0 ? (
                                                    <option value="">Belum ada file Excel aktif</option>
                                                ) : (
                                                    riskProfileExcelFiles.map((file) => (
                                                        <option key={file.name} value={file.name}>
                                                            {file.name} • {formatDate(file.modifiedAt)}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => saveRiskProfileSourceMutation.mutate(riskProfileSourceDraft)}
                                                disabled={riskProfileExcelFiles.length === 0 || saveRiskProfileSourceMutation.isPending || !dashboardSettings}
                                                style={{
                                                    border: "1px solid #d97706",
                                                    color: "#92400e",
                                                    backgroundColor: "#fff",
                                                    borderRadius: 6,
                                                    padding: "6px 12px",
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    cursor: "pointer",
                                                    opacity: riskProfileExcelFiles.length === 0 || saveRiskProfileSourceMutation.isPending || !dashboardSettings ? 0.7 : 1,
                                                }}
                                            >
                                                {saveRiskProfileSourceMutation.isPending ? "Menyimpan..." : "Simpan Sumber Data"}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isRegulasiCategory && viewMode === "active" && (
                                    <CoverOrderList
                                        title="Urutan Cover Regulasi (List)"
                                        borderColor="#c7d2fe"
                                        bg="#eef2ff"
                                        titleColor="#3730a3"
                                        items={regulasiOrderDraft}
                                        getLabel={getRegulasiLabelByFileName}
                                        onReorder={handleRegulasiOrderReorder}
                                        disabled={!dashboardSettings || saveRegulasiOrderMutation.isPending}
                                        isSaving={saveRegulasiOrderMutation.isPending}
                                    />
                                )}

                                {isSoftstructureCategory && viewMode === "active" && (
                                    <CoverOrderList
                                        title="Urutan Cover Softstructure (List)"
                                        borderColor="#99f6e4"
                                        bg="#f0fdfa"
                                        titleColor="#0f766e"
                                        items={softstructureOrderDraft}
                                        getLabel={getSoftstructureLabelByFileName}
                                        onReorder={handleSoftstructureOrderReorder}
                                        disabled={!dashboardSettings || saveSoftstructureOrderMutation.isPending}
                                        isSaving={saveSoftstructureOrderMutation.isPending}
                                    />
                                )}

                                {isKajianCategory && viewMode === "active" && (
                                    <CoverOrderList
                                        title="Urutan Cover Kajian (List)"
                                        borderColor="#86efac"
                                        bg="#f0fdf4"
                                        titleColor="#166534"
                                        items={kajianOrderDraft}
                                        getLabel={getKajianLabelByFileName}
                                        onReorder={handleKajianOrderReorder}
                                        disabled={!dashboardSettings || saveKajianOrderMutation.isPending}
                                        isSaving={saveKajianOrderMutation.isPending}
                                    />
                                )}

                                {/* Status */}
                                {uploadStatus && (
                                    <div
                                        style={{
                                            marginTop: 10,
                                            padding: "8px 14px",
                                            borderRadius: 7,
                                            fontSize: 13,
                                            fontWeight: 600,
                                            backgroundColor: uploadStatus.ok ? "#dcfce7" : "#fee2e2",
                                            color: uploadStatus.ok ? "#166534" : "#991b1b",
                                            border: `1px solid ${uploadStatus.ok ? "#bbf7d0" : "#fecaca"}`,
                                        }}
                                    >
                                        {uploadStatus.msg}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* File List */}
                        <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                            <div className="card-body p-3">
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                                            {`File Aktif dalam \"${activeCat.label}\"`}
                                            <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400, marginLeft: 8 }}>
                                                ({files.length} file)
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {isLoading ? (
                                    <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>Memuat dokumen...</div>
                                ) : files.length === 0 ? (
                                    <div
                                        style={{
                                            textAlign: "center",
                                            padding: "32px 24px",
                                            color: "#94a3b8",
                                            backgroundColor: "#f8fafc",
                                            borderRadius: 8,
                                            border: "1px dashed #e2e8f0",
                                        }}
                                    >
                                        <i className="icon-paper" style={{ fontSize: 28, display: "block", marginBottom: 8 }}></i>
                                        <div style={{ fontSize: 13 }}>Belum ada file aktif di kategori ini</div>
                                        <div style={{ fontSize: 11, marginTop: 4 }}>Upload file di atas untuk memulai</div>
                                    </div>
                                ) : (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                        {files.map((file) => (
                                            <div
                                                key={file.name}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 12,
                                                    padding: "10px 12px",
                                                    borderRadius: 8,
                                                    border: "1px solid #f1f5f9",
                                                    backgroundColor: "#fafafa",
                                                }}
                                            >
                                                {/* Icon */}
                                                <div
                                                    style={{
                                                        width: 36,
                                                        height: 36,
                                                        borderRadius: 8,
                                                        backgroundColor:
                                                            file.type === "PDF" ? "#fee2e2" : file.type === "Gambar" ? "#dbeafe" : "#f1f5f9",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        flexShrink: 0,
                                                        fontSize: 11,
                                                        fontWeight: 800,
                                                        color:
                                                            file.type === "PDF" ? "#991b1b" : file.type === "Gambar" ? "#1d4ed8" : "#475569",
                                                    }}
                                                >
                                                    {file.type === "PDF" ? "PDF" : file.type === "Gambar" ? "IMG" : "DOC"}
                                                </div>
                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div
                                                        style={{
                                                            fontSize: 12,
                                                            fontWeight: 600,
                                                            color: "#1e293b",
                                                            whiteSpace: "nowrap",
                                                            overflow: "hidden",
                                                            textOverflow: "ellipsis",
                                                        }}
                                                        title={file.name}
                                                    >
                                                        {file.name}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>
                                                        {formatBytes(file.size)} • {formatDate(file.modifiedAt)}
                                                    </div>
                                                </div>
                                                {/* Actions */}
                                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                                    <a
                                                        href={buildReaderHref(file.url, file.name)}
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #e2e8f0",
                                                            backgroundColor: "#fff",
                                                            color: "#475569",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            textDecoration: "none",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Read
                                                    </a>
                                                    <a
                                                        href={file.url}
                                                        download={file.name}
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #dbeafe",
                                                            backgroundColor: "#eff6ff",
                                                            color: "#1d4ed8",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            textDecoration: "none",
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Download
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleQuickUpdate(file)}
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #bfdbfe",
                                                            backgroundColor: "#eff6ff",
                                                            color: "#1d4ed8",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Update
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmDelete(file)}
                                                        style={{
                                                            padding: "4px 10px",
                                                            borderRadius: 6,
                                                            border: "1px solid #fca5a5",
                                                            backgroundColor: "#fff1f2",
                                                            color: "#b91c1c",
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                        }}
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Confirm Delete Modal ─────────────────────────────────────── */}
            {confirmDelete && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "rgba(0,0,0,0.5)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 9999,
                    }}
                >
                    <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Delete ke Recycle?</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                            File <strong style={{ color: "#c2410c" }}>{confirmDelete.name}</strong> akan dihapus dari daftar aktif dan dipindahkan ke recycle.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setConfirmDelete(null)}
                                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => deleteMutation.mutate(confirmDelete)}
                                disabled={deleteMutation.isPending}
                                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: deleteMutation.isPending ? 0.7 : 1 }}
                            >
                                {deleteMutation.isPending ? "Memproses..." : "Ya, Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
