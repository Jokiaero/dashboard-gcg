"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type DocFile = {
    name: string;
    url: string;
    size: number;
    type: string;
    category: string;
    modifiedAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
    all: "Semua Kategori",
    regulasi: "Regulasi",
    softstructure: "Softstructure",
    assessment: "Assessment",
    kajian: "Kajian",
    penghargaan: "Berita GCG",
    documents: "Dokumen Umum",
    pelaporan_wbs: "Laporan WBS",
    pelaporan_risiko: "Laporan Profil Risiko",
    pelaporan_penyuapan: "Monitoring Risiko Penyuapan",
    pelaporan_ppg: "Implementasi PPG ke KPK",
    pelaporan_survey: "Survey Awareness GCG",
    approval_kepatuhan: "Approval Kepatuhan",
};

const FILTER_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getCategoryLabel(category: string): string {
    return CATEGORY_LABELS[category] || category;
}

export default function AdminRecyclePanel() {
    const queryClient = useQueryClient();
    const [categoryFilter, setCategoryFilter] = useState<string>("all");
    const [keyword, setKeyword] = useState<string>("");
    const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<DocFile | null>(null);
    const [confirmDeleteAll, setConfirmDeleteAll] = useState<boolean>(false);

    const { data, isLoading, refetch } = useQuery<{ files: DocFile[] }>({
        queryKey: ["adminDocsRecycleGlobal", categoryFilter],
        queryFn: async () => {
            const categoryParam = categoryFilter === "all" ? "all" : categoryFilter;
            const res = await fetch(`/api/admin/documents?category=${encodeURIComponent(categoryParam)}&deleted=1`);
            if (!res.ok) throw new Error("Gagal memuat data recycle");
            return res.json();
        },
    });

    const files = useMemo(() => data?.files ?? [], [data?.files]);

    const visibleFiles = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLowerCase();
        if (!normalizedKeyword) return files;
        return files.filter((file) => {
            const categoryLabel = getCategoryLabel(file.category).toLowerCase();
            return (
                file.name.toLowerCase().includes(normalizedKeyword) ||
                categoryLabel.includes(normalizedKeyword)
            );
        });
    }, [files, keyword]);

    const invalidateRelatedQueries = (category: string) => {
        queryClient.invalidateQueries({ queryKey: ["adminDocs"] });
        queryClient.invalidateQueries({ queryKey: ["adminDocsRecycleGlobal"] });

        if (category === "penghargaan") {
            queryClient.invalidateQueries({ queryKey: ["penghargaanDocumentsList"] });
            queryClient.invalidateQueries({ queryKey: ["dashboardSettingsPenghargaanPage"] });
        }
        if (category === "regulasi") {
            queryClient.invalidateQueries({ queryKey: ["dashboardSettingsRegulasiOrder"] });
        }
        if (category === "softstructure") {
            queryClient.invalidateQueries({ queryKey: ["dashboardSettingsSoftstructureOrder"] });
            queryClient.invalidateQueries({ queryKey: ["softstructureDocumentsCatalogList"] });
        }
        if (category === "kajian") {
            queryClient.invalidateQueries({ queryKey: ["dashboardSettingsKajianOrder"] });
            queryClient.invalidateQueries({ queryKey: ["kajianDocumentsCatalogList"] });
        }
        if (category === "pelaporan_risiko") {
            queryClient.invalidateQueries({ queryKey: ["riskProfileData"] });
        }
    };

    const restoreMutation = useMutation({
        mutationFn: async (file: DocFile) => {
            const res = await fetch("/api/admin/documents", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: file.category, name: file.name, action: "restore" }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal memulihkan file");
        },
        onSuccess: (_data, file) => {
            invalidateRelatedQueries(file.category);
        },
    });

    const permanentDeleteMutation = useMutation({
        mutationFn: async (file: DocFile) => {
            const res = await fetch("/api/admin/documents", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: file.category, name: file.name, action: "permanent-delete" }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal menghapus permanen");
        },
        onSuccess: (_data, file) => {
            invalidateRelatedQueries(file.category);
            setConfirmPermanentDelete(null);
        },
    });

    const deleteAllMutation = useMutation({
        mutationFn: async () => {
            const categoryParam = categoryFilter === "all" ? "all" : categoryFilter;
            const res = await fetch("/api/admin/documents/delete-all", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: categoryParam }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Gagal menghapus semua file");
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminDocsRecycleGlobal"] });
            setConfirmDeleteAll(false);
            refetch();
        },
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
                        Recycle
                    </h4>
                    <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 13, marginBottom: 0 }}>
                        Semua file terhapus dari seluruh kategori dikelola dalam satu halaman.
                    </p>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                        onClick={() => refetch()}
                        style={{
                            border: "1px solid rgba(255,255,255,0.35)",
                            backgroundColor: "rgba(255,255,255,0.15)",
                            color: "#fff",
                            borderRadius: 7,
                            padding: "7px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        Muat Ulang
                    </button>
                    {visibleFiles.length > 0 && (
                        <button
                            onClick={() => setConfirmDeleteAll(true)}
                            disabled={deleteAllMutation.isPending}
                            style={{
                                border: "1px solid rgba(255,200,200,0.5)",
                                backgroundColor: "rgba(239,68,68,0.2)",
                                color: "#fff",
                                borderRadius: 7,
                                padding: "7px 14px",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                opacity: deleteAllMutation.isPending ? 0.7 : 1,
                            }}
                        >
                            Hapus Semua
                        </button>
                    )}
                    <Link
                        href="/admin"
                        style={{
                            border: "1px solid rgba(255,255,255,0.35)",
                            backgroundColor: "rgba(255,255,255,0.15)",
                            color: "#fff",
                            borderRadius: 7,
                            padding: "7px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                        }}
                    >
                        Kembali ke Konten
                    </Link>
                </div>
            </div>

            <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                <div className="card-body p-3">
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                        <div style={{ minWidth: 230 }}>
                            <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
                                Filter Kategori
                            </label>
                            <select
                                className="form-control form-control-sm"
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                            >
                                {FILTER_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ minWidth: 250, flex: 1 }}>
                            <label style={{ display: "block", fontSize: 11, color: "#64748b", fontWeight: 700, marginBottom: 4 }}>
                                Pencarian
                            </label>
                            <input
                                className="form-control form-control-sm"
                                placeholder="Cari nama file atau kategori..."
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div style={{ textAlign: "center", padding: 24, color: "#94a3b8", fontSize: 13 }}>Memuat data recycle...</div>
                    ) : visibleFiles.length === 0 ? (
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
                            <div style={{ fontSize: 13 }}>Recycle kosong</div>
                            <div style={{ fontSize: 11, marginTop: 4 }}>File yang dipindahkan ke recycle dari semua kategori akan muncul di sini</div>
                        </div>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {visibleFiles.map((file) => (
                                <div
                                    key={`${file.category}-${file.name}`}
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
                                        <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1, display: "flex", gap: 8 }}>
                                            <span>{formatBytes(file.size)}</span>
                                            <span>{formatDate(file.modifiedAt)}</span>
                                            <span
                                                style={{
                                                    padding: "0 6px",
                                                    borderRadius: 999,
                                                    backgroundColor: "#e2e8f0",
                                                    color: "#334155",
                                                    fontWeight: 700,
                                                }}
                                            >
                                                {getCategoryLabel(file.category)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
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
                                            onClick={() => restoreMutation.mutate(file)}
                                            disabled={restoreMutation.isPending}
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: 6,
                                                border: "1px solid #86efac",
                                                backgroundColor: "#fff",
                                                color: "#166534",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                                opacity: restoreMutation.isPending ? 0.7 : 1,
                                            }}
                                        >
                                            Pulihkan
                                        </button>
                                        <button
                                            onClick={() => setConfirmPermanentDelete(file)}
                                            style={{
                                                padding: "4px 10px",
                                                borderRadius: 6,
                                                border: "1px solid #fecaca",
                                                backgroundColor: "#fff",
                                                color: "#dc2626",
                                                fontSize: 11,
                                                fontWeight: 600,
                                                cursor: "pointer",
                                            }}
                                        >
                                            Hapus Permanen
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {confirmPermanentDelete && (
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
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Hapus Permanen?</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                            File <strong style={{ color: "#dc2626" }}>{confirmPermanentDelete.name}</strong> akan dihapus permanen dari recycle dan file fisik juga dihapus dari server.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setConfirmPermanentDelete(null)}
                                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => permanentDeleteMutation.mutate(confirmPermanentDelete)}
                                disabled={permanentDeleteMutation.isPending}
                                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: permanentDeleteMutation.isPending ? 0.7 : 1 }}
                            >
                                {permanentDeleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Permanen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmDeleteAll && (
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
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Hapus Semua File?</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                            Anda akan menghapus <strong style={{ color: "#dc2626" }}>{visibleFiles.length} file</strong> secara permanen dari recycle{categoryFilter !== "all" && ` pada kategori ${getCategoryLabel(categoryFilter)}`}. Tindakan ini tidak dapat dibatalkan. File fisik juga akan dihapus dari server.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button
                                onClick={() => setConfirmDeleteAll(false)}
                                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => deleteAllMutation.mutate()}
                                disabled={deleteAllMutation.isPending}
                                style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, opacity: deleteAllMutation.isPending ? 0.7 : 1 }}
                            >
                                {deleteAllMutation.isPending ? "Menghapus..." : "Ya, Hapus Semua"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
