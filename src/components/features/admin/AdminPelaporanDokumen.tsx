"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type DocFile = {
    name: string;
    url: string;
    size: number;
    type: string;
    category: string;
    modifiedAt: string;
};

type ViewMode = "active" | "recycle";

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminPelaporanDokumen({ category, title = "Manajemen Dokumen Laporan", onSuccess }: { category: string, title?: string, onSuccess?: () => void }) {
    const [viewMode, setViewMode] = useState<ViewMode>("active");
    const [uploadTargetName, setUploadTargetName] = useState("");
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<DocFile | null>(null);
    const [confirmPermanentDelete, setConfirmPermanentDelete] = useState<DocFile | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    // Cek role user
    const { data: userSession } = useQuery({
        queryKey: ["userSession"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me");
            if (!res.ok) return null;
            return res.json();
        }
    });

    const isAdmin = userSession?.role === "ADMIN";

    // Fetch files
    const { data, isLoading, refetch } = useQuery<{ files: DocFile[] }>({
        queryKey: ["adminDocs", category, viewMode],
        queryFn: async () => {
            const res = await fetch(`/api/admin/documents?category=${category}&deleted=${viewMode === "recycle" ? "1" : "0"}`);
            if (!res.ok) throw new Error("Gagal memuat dokumen");
            return res.json();
        },
    });

    const files = data?.files ?? [];

    const invalidateCategoryLists = () => {
        queryClient.invalidateQueries({ queryKey: ["adminDocs", category, "active"] });
        queryClient.invalidateQueries({ queryKey: ["adminDocs", category, "recycle"] });
    };

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (file: DocFile) => {
            const res = await fetch("/api/admin/documents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: file.category, name: file.name }),
            });
            if (!res.ok) throw new Error("Gagal menghapus file");
        },
        onSuccess: () => {
            invalidateCategoryLists();
            setConfirmDelete(null);
            setViewMode("active");
            onSuccess?.();
        },
    });

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
        onSuccess: () => {
            invalidateCategoryLists();
            onSuccess?.();
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
        onSuccess: () => {
            invalidateCategoryLists();
            setConfirmPermanentDelete(null);
            onSuccess?.();
        },
    });

    // Upload
    const handleUpload = async (file: File) => {
        if (!isAdmin) return;
        setUploading(true);
        setUploadStatus(null);
        const form = new FormData();
        form.append("file", file);
        form.append("category", category);
        if (uploadTargetName.trim()) {
            form.append("targetName", uploadTargetName.trim());
        }

        try {
            const res = await fetch("/api/admin/upload", { method: "POST", body: form });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Upload gagal");
            setUploadStatus({ ok: true, msg: `✓ File "${json.name}" berhasil diupload!` });
            setUploadTargetName("");
            setViewMode("active");
            invalidateCategoryLists();
            onSuccess?.();
        } catch (err: any) {
            setUploadStatus({ ok: false, msg: `✗ ${err.message}` });
        } finally {
            setUploading(false);
        }
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) handleUpload(f);
        e.target.value = "";
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const f = e.dataTransfer.files?.[0];
        if (f) handleUpload(f);
    }, [category, uploadTargetName, isAdmin]);

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = () => setIsDragging(false);
    const needsExcelForStats = [
        "pelaporan_wbs",
        "pelaporan_risiko",
        "pelaporan_penyuapan",
        "pelaporan_ppg",
        "pelaporan_survey",
        "approval_kepatuhan",
        "assessment",
    ].includes(category);

    return (
        <div className="card shadow-sm" style={{ borderRadius: 8, marginTop: 24 }}>
            <div className="card-body p-4">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1a3a2a", margin: 0 }}>{title}</h4>
                        <p style={{ fontSize: 13, color: "#64748b", margin: 0, marginTop: 4 }}>Arsip dokumen PDF/Excel untuk {title.toLowerCase()}</p>
                    </div>
                    {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                            <button
                                onClick={() => setViewMode("active")}
                                style={{
                                    padding: "5px 12px",
                                    borderRadius: 999,
                                    border: viewMode === "active" ? "1px solid #0f766e" : "1px solid #e2e8f0",
                                    backgroundColor: viewMode === "active" ? "#ecfeff" : "#fff",
                                    color: viewMode === "active" ? "#0f766e" : "#64748b",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                File Aktif
                            </button>
                            <button
                                onClick={() => setViewMode("recycle")}
                                style={{
                                    padding: "5px 12px",
                                    borderRadius: 999,
                                    border: viewMode === "recycle" ? "1px solid #b45309" : "1px solid #e2e8f0",
                                    backgroundColor: viewMode === "recycle" ? "#fffbeb" : "#fff",
                                    color: viewMode === "recycle" ? "#92400e" : "#64748b",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                Recycle
                            </button>
                        </div>
                    )}
                </div>

                {isAdmin && viewMode === "active" && (
                    <div style={{ marginBottom: 24, padding: "20px", borderRadius: 8, backgroundColor: "#f8fafc", border: "1px dashed #cbd5e1" }}>
                        {needsExcelForStats && (
                            <div
                                style={{
                                    marginBottom: 12,
                                    padding: "8px 12px",
                                    borderRadius: 6,
                                    backgroundColor: "#ecfeff",
                                    border: "1px solid #a5f3fc",
                                    color: "#0f766e",
                                    fontSize: 12,
                                    fontWeight: 600,
                                }}
                            >
                                Catatan: PDF tersimpan sebagai arsip dokumen. Untuk kartu statistik/grafik laporan, sistem membaca file Excel (.xlsx/.xls).
                            </div>
                        )}
                        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: 250 }}>
                                <label style={{ fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 6 }}>
                                    Nama Dokumen Opsional (Kosongkan utk nama asli)
                                </label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Contoh: Laporan_Triwulan_1..."
                                    value={uploadTargetName}
                                    onChange={(e) => setUploadTargetName(e.target.value)}
                                    style={{ fontSize: 13, padding: "8px 12px", borderRadius: 6 }}
                                />
                            </div>
                            <div
                                onDrop={onDrop}
                                onDragOver={onDragOver}
                                onDragLeave={onDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    flex: 2,
                                    border: `2px dashed ${isDragging ? "#10b981" : "#94a3b8"}`,
                                    borderRadius: 6,
                                    padding: "20px",
                                    textAlign: "center",
                                    backgroundColor: isDragging ? "#dcfce7" : "#fff",
                                    cursor: uploading ? "not-allowed" : "pointer",
                                    opacity: uploading ? 0.6 : 1,
                                    transition: "all 0.2s"
                                }}
                            >
                                {uploading ? (
                                    <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>Tunggu sebentar, mengupload...</span>
                                ) : (
                                    <span style={{ fontSize: 13, color: "#475569", fontWeight: 600 }}>
                                        <i className="ti-cloud-up mr-2"></i> Klik atau Drag & Drop file (PDF/Excel) kesini &rarr;
                                    </span>
                                )}
                                <input ref={fileInputRef} type="file" style={{ display: "none" }} accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls" onChange={onFileChange} />
                            </div>
                        </div>

                        {uploadStatus && (
                            <div style={{
                                marginTop: 12, padding: "8px 14px", borderRadius: 6, fontSize: 13, fontWeight: 600,
                                backgroundColor: uploadStatus.ok ? "#dcfce7" : "#fee2e2",
                                color: uploadStatus.ok ? "#166534" : "#991b1b"
                            }}>
                                {uploadStatus.msg}
                            </div>
                        )}
                    </div>
                )}

                {isAdmin && viewMode === "recycle" && (
                    <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 8, backgroundColor: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: 12, fontWeight: 600 }}>
                        Recycle menampung file terhapus. Anda dapat memulihkan file atau menghapusnya permanen.
                    </div>
                )}

                <div className="table-responsive" style={{ borderRadius: 6, border: "1px solid #f1f5f9" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f8fafc", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 11 }}>
                                <th style={{ padding: "12px 16px", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>Nama File</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>Ukuran</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, borderBottom: "1px solid #e2e8f0" }}>Tgl Diubah</th>
                                <th style={{ padding: "12px 16px", fontWeight: 700, borderBottom: "1px solid #e2e8f0", textAlign: "right" }}>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>Memuat dokumen...</td>
                                </tr>
                            ) : files.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ padding: 20, textAlign: "center", color: "#94a3b8" }}>
                                        {viewMode === "active" ? "Belum ada arsip laporan aktif." : "Recycle kosong."}
                                    </td>
                                </tr>
                            ) : (
                                files.map((file, idx) => (
                                    <tr key={idx} style={{
                                        borderBottom: idx === files.length - 1 ? "none" : "1px solid #f1f5f9",
                                        backgroundColor: "#fff"
                                    }}>
                                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1e293b", maxWidth: 300, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                            <span style={{ 
                                                display: "inline-block", padding: "2px 6px", borderRadius: 4, marginRight: 8, fontSize: 10, fontWeight: 800,
                                                backgroundColor: file.type === "PDF" ? "#fee2e2" : "#f1f5f9",
                                                color: file.type === "PDF" ? "#991b1b" : "#475569"
                                            }}>
                                                {file.type}
                                            </span>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" style={{ color: "#2563eb", textDecoration: "none" }} title={file.name}>
                                                {file.name}
                                            </a>
                                        </td>
                                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{formatBytes(file.size)}</td>
                                        <td style={{ padding: "12px 16px", color: "#64748b" }}>{formatDate(file.modifiedAt)}</td>
                                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" style={{
                                                    padding: "4px 12px", borderRadius: 6, border: "1px solid #e2e8f0", backgroundColor: "#fff",
                                                    color: "#475569", fontSize: 11, fontWeight: 700, textDecoration: "none", cursor: "pointer"
                                                }}>
                                                    {file.type === "PDF" ? "Lihat" : "Unduh"}
                                                </a>
                                                {isAdmin && (
                                                    viewMode === "active" ? (
                                                        <button
                                                            onClick={() => setConfirmDelete(file)}
                                                            style={{
                                                                padding: "4px 12px", borderRadius: 6, border: "1px solid #fed7aa", backgroundColor: "#fff",
                                                                color: "#c2410c", fontSize: 11, fontWeight: 700, cursor: "pointer"
                                                            }}
                                                        >
                                                            Pindahkan
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => restoreMutation.mutate(file)}
                                                                disabled={restoreMutation.isPending}
                                                                style={{
                                                                    padding: "4px 12px", borderRadius: 6, border: "1px solid #86efac", backgroundColor: "#fff",
                                                                    color: "#166534", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: restoreMutation.isPending ? 0.7 : 1
                                                                }}
                                                            >
                                                                Pulihkan
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmPermanentDelete(file)}
                                                                style={{
                                                                    padding: "4px 12px", borderRadius: 6, border: "1px solid #fecaca", backgroundColor: "#fff",
                                                                    color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer"
                                                                }}
                                                            >
                                                                Hapus Permanen
                                                            </button>
                                                        </>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            {confirmDelete && (
                <div style={{
                    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
                }}>
                    <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Pindahkan ke Recycle?</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                            Dokumen <strong style={{ color: "#c2410c" }}>{confirmDelete.name}</strong> akan dipindahkan ke recycle dan masih bisa dipulihkan.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                                Batal
                            </button>
                            <button onClick={() => deleteMutation.mutate(confirmDelete)} disabled={deleteMutation.isPending} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                                {deleteMutation.isPending ? "Memproses..." : "Ya, Pindahkan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmPermanentDelete && (
                <div style={{
                    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
                }}>
                    <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, maxWidth: 420, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Hapus Permanen?</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                            Dokumen <strong style={{ color: "#dc2626" }}>{confirmPermanentDelete.name}</strong> akan dihapus permanen dari recycle dan file fisik di server juga dihapus.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setConfirmPermanentDelete(null)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
                                Batal
                            </button>
                            <button onClick={() => permanentDeleteMutation.mutate(confirmPermanentDelete)} disabled={permanentDeleteMutation.isPending} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                                {permanentDeleteMutation.isPending ? "Menghapus..." : "Ya, Hapus Permanen"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
