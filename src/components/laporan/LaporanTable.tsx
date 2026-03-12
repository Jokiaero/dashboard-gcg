"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import LaporanFormModal from "./LaporanFormModal";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { exportToExcel, exportToPDF } from "@/lib/exportUtils";

export type Laporan = {
    id: number;
    tahun?: string;
    pers_no?: string;
    nik?: string;
    nama?: string;
    jabatan?: string;
    ou?: string;
    file?: string;
    status_approved?: string;
    site?: string;
    approved_by?: string;
    approved_date?: string;
    updated_by?: string;
    generated_by?: string;
    sign_loc?: string;
    kode_jabatan?: string;
    jabatan_lengkap?: string;
    dept_id?: string;
    department?: string;
    div_id?: string;
    divisi?: string;
    direktorat_id?: string;
    direktorat?: string;
    work_contract_id?: string;
    work_contract?: string;
};

async function fetchLaporan(search: string) {
    const res = await fetch(`/api/laporan?search=${encodeURIComponent(search)}&limit=100`);
    if (!res.ok) throw new Error("Gagal memuat data");
    return res.json();
}

export default function LaporanTable() {
    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editData, setEditData] = useState<Laporan | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: ["laporan", search],
        queryFn: () => fetchLaporan(search),
    });

    const { data: userSession } = useQuery({
        queryKey: ["userSession"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me");
            if (!res.ok) return null;
            return res.json();
        }
    });

    const isReadOnly = userSession?.role === "AUDITOR" || userSession?.role === "GUEST";

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/laporan/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Gagal menghapus");
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laporan"] }),
    });

    const rows: Laporan[] = data?.data ?? [];

    const handleEdit = (row: Laporan) => {
        setEditData(row);
        setModalOpen(true);
    };

    const handleAdd = () => {
        setEditData(null);
        setModalOpen(true);
    };

    const handleExportExcel = () => {
        exportToExcel(rows, "Laporan_Data_GCG");
    };

    const handleExportPDF = () => {
        const columns = [
            { header: "Tahun", dataKey: "tahun" },
            { header: "Pers No", dataKey: "pers_no" },
            { header: "NIK", dataKey: "nik" },
            { header: "Nama", dataKey: "nama" },
            { header: "Jabatan", dataKey: "jabatan" },
            { header: "OU", dataKey: "ou" },
            { header: "Status", dataKey: "status_approved" },
            { header: "Site", dataKey: "site" },
            { header: "Dept", dataKey: "department" },
            { header: "Divisi", dataKey: "divisi" }
        ];
        exportToPDF(rows, columns, "Laporan_Data_GCG", "Laporan Rekapitulasi Data GCG");
    };

    return (
        <div className="row">
            <div className="col-12 grid-margin stretch-card">
                <div className="card shadow-sm" style={{ borderRadius: 6 }}>
                    <div className="card-body">
                        <h4
                            className="card-title mb-4 text-center fw-bold"
                            style={{ color: "#2b4c3d", fontSize: "1.5rem", fontWeight: 800 }}
                        >
                            OVERVIEW DASHBOARD GCG
                        </h4>

                        {/* Toolbar */}
                        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                            <input
                                type="text"
                                className="form-control"
                                style={{ maxWidth: 300 }}
                                placeholder="Cari nama, NIK, jabatan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                            <div className="d-flex gap-2">
                                <button
                                    className="btn btn-outline-success"
                                    onClick={handleExportExcel}
                                    title="Export to Excel"
                                >
                                    <i className="ti-import me-1"></i> Excel
                                </button>
                                <button
                                    className="btn btn-outline-danger"
                                    onClick={handleExportPDF}
                                    title="Export to PDF"
                                >
                                    <i className="ti-import me-1"></i> PDF
                                </button>
                                {!isReadOnly && (
                                    <button
                                        className="btn text-white"
                                        style={{ backgroundColor: "#2b4c3d", borderColor: "#2b4c3d", whiteSpace: "nowrap" }}
                                        onClick={handleAdd}
                                    >
                                        <i className="ti-plus me-1"></i> Tambah Data
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Table */}
                        {isLoading ? (
                            <p className="text-muted text-center py-4">Memuat data...</p>
                        ) : error ? (
                            <p className="text-danger text-center py-4">Gagal memuat data</p>
                        ) : (
                            <div style={{ width: "100%", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 6 }}>
                                <table className="table table-bordered table-hover mb-0" style={{ whiteSpace: "nowrap", fontSize: 13 }}>
                                    <thead style={{ backgroundColor: "#f8fafc" }}>
                                        <tr>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>#</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>TAHUN</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>PERS_NO</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>NIK</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>NAMA</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>JABATAN</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>OU</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>STATUS_A</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>SITE</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>APPROVED_BY</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>DEPT</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>DIVISI</th>
                                            <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>DIREKTORAT</th>
                                            {!isReadOnly && <th style={{ color: "#475569", fontSize: 11, textTransform: "uppercase" }}>AKSI</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.length === 0 ? (
                                            <tr>
                                                <td colSpan={14} className="text-center text-muted py-4">
                                                    Belum ada data
                                                </td>
                                            </tr>
                                        ) : (
                                            rows.map((row, idx) => (
                                                <tr key={row.id}>
                                                    <td>{idx + 1}</td>
                                                    <td>{row.tahun || "-"}</td>
                                                    <td>{row.pers_no || "-"}</td>
                                                    <td>{row.nik || "-"}</td>
                                                    <td>{row.nama || "-"}</td>
                                                    <td>{row.jabatan || "-"}</td>
                                                    <td>{row.ou || "-"}</td>
                                                    <td>
                                                        {row.status_approved ? (
                                                            <span
                                                                className="badge"
                                                                style={{
                                                                    backgroundColor: row.status_approved === "APPROVED" ? "#2b4c3d" : "#f59e0b",
                                                                    color: "#fff",
                                                                    fontSize: 11,
                                                                }}
                                                            >
                                                                {row.status_approved}
                                                            </span>
                                                        ) : "-"}
                                                    </td>
                                                    <td>{row.site || "-"}</td>
                                                    <td>{row.approved_by || "-"}</td>
                                                    <td>{row.department || "-"}</td>
                                                    <td>{row.divisi || "-"}</td>
                                                    <td>{row.direktorat || "-"}</td>
                                                    {!isReadOnly && (
                                                        <td>
                                                            <button
                                                                className="btn btn-sm me-1"
                                                                style={{ backgroundColor: "#2b4c3d", color: "#fff", padding: "3px 10px" }}
                                                                onClick={() => handleEdit(row)}
                                                                title="Edit"
                                                            >
                                                                <i className="ti-pencil"></i>
                                                            </button>
                                                            <button
                                                                className="btn btn-sm btn-danger"
                                                                style={{ padding: "3px 10px" }}
                                                                onClick={() => setDeleteId(row.id)}
                                                                title="Hapus"
                                                            >
                                                                <i className="ti-trash"></i>
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <p className="text-muted mt-2" style={{ fontSize: 12 }}>
                            Total: {data?.total ?? 0} baris
                        </p>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <LaporanFormModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                editData={editData}
            />
            <DeleteConfirmDialog
                open={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId) deleteMutation.mutate(deleteId);
                    setDeleteId(null);
                }}
            />
        </div>
    );
}
