"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type User = {
    id: number;
    username: string;
    role: string;
    createdAt: string;
};

const ROLE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
    ADMIN: { label: "Admin",      bg: "#10b981", color: "#fff" },
    USER_VIP: { label: "VIP",        bg: "#c8a951", color: "#fff" },
    USER: { label: "User",       bg: "#64748b", color: "#fff" },
};

export default function AdminUsersPage() {
    const queryClient = useQueryClient();
    const [showAddForm, setShowAddForm] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);
    const [newUsername, setNewUsername] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("USER");
    const [editRole, setEditRole] = useState("");
    const [editPassword, setEditPassword] = useState("");
    const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [confirmDeleteUser, setConfirmDeleteUser] = useState<User | null>(null);

    const { data, isLoading } = useQuery<{ users: User[] }>({
        queryKey: ["adminUsers"],
        queryFn: async () => {
            const res = await fetch("/api/admin/users");
            if (!res.ok) throw new Error("Gagal memuat pengguna");
            return res.json();
        },
    });

    const users = data?.users ?? [];

    const addMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/admin/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: newUsername, password: newPassword, role: newRole }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
            setMsg({ ok: true, text: `Pengguna "${newUsername}" berhasil ditambahkan!` });
            setNewUsername(""); setNewPassword(""); setNewRole("USER");
            setShowAddForm(false);
        },
        onError: (e: any) => setMsg({ ok: false, text: e.message }),
    });

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editUser?.id, role: editRole, password: editPassword || undefined }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
            setMsg({ ok: true, text: `Pengguna "${editUser?.username}" berhasil diperbarui!` });
            setEditUser(null); setEditRole(""); setEditPassword("");
        },
        onError: (e: any) => setMsg({ ok: false, text: e.message }),
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch("/api/admin/users", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            return json;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
            setMsg({ ok: true, text: "Pengguna berhasil dihapus!" });
            setConfirmDeleteUser(null);
        },
        onError: (e: any) => setMsg({ ok: false, text: e.message }),
    });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Header */}
            <div style={{ background: "linear-gradient(135deg,#1a3a2a,#2b4c3d)", borderRadius: 10, padding: "18px 24px", boxShadow: "0 4px 15px rgba(43,76,61,.25)" }}>
                <h4 style={{ color: "#fff", fontWeight: 800, marginBottom: 4, fontSize: "1.1rem" }}>Manajemen Pengguna</h4>
                <p style={{ color: "rgba(255,255,255,.7)", fontSize: 13, marginBottom: 0 }}>
                    Tambah, ubah role, atau hapus pengguna sistem
                </p>
            </div>

            {/* Status message */}
            {msg && (
                <div
                    style={{
                        padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                        backgroundColor: msg.ok ? "#dcfce7" : "#fee2e2",
                        color: msg.ok ? "#166534" : "#991b1b",
                        border: `1px solid ${msg.ok ? "#bbf7d0" : "#fecaca"}`,
                    }}
                >
                    {msg.text}
                    <button onClick={() => setMsg(null)} style={{ float: "right", border: "none", background: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}>×</button>
                </div>
            )}

            {/* Keterangan Role */}
            <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                <div className="card-body p-3">
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>Keterangan Hak Akses</div>
                    <div className="row g-3">
                        {[
                            { role: "ADMIN", label: "Admin", bg: "#10b981", color: "#fff", desc: "Akses penuh sistem, manajemen user & log" },
                            { role: "USER_VIP", label: "VIP", bg: "#c8a951", color: "#fff", desc: "Akses baca semua halaman: Laporan, Kajian, Assessment, Softstructure, Berita GCG" },
                            { role: "USER", label: "User", bg: "#64748b", color: "#fff", desc: "Akses Dashboard dan Regulasi" },
                        ].map((r) => (
                            <div key={r.role} className="col-md-4">
                                <div style={{ padding: "12px 14px", borderRadius: 8, border: "1px solid #f1f5f9", backgroundColor: "#f8fafc" }}>
                                    <span style={{ backgroundColor: r.bg, color: r.color, padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{r.label}</span>
                                    <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>{r.desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* User Table */}
            <div className="card shadow-sm" style={{ borderRadius: 8 }}>
                <div className="card-body p-3">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                            Daftar Pengguna <span style={{ color: "#94a3b8", fontWeight: 400 }}>({users.length} akun)</span>
                        </div>
                        <button
                            onClick={() => { setShowAddForm(!showAddForm); setMsg(null); }}
                            style={{ padding: "7px 16px", borderRadius: 7, border: "none", backgroundColor: "#2b4c3d", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                            Tambah Pengguna
                        </button>
                    </div>

                    {/* Add Form */}
                    {showAddForm && (
                        <div style={{ padding: "16px", borderRadius: 8, backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 12 }}>Tambah Pengguna Baru</div>
                            <div className="row g-2 align-items-end">
                                <div className="col-sm-4">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Username</label>
                                    <input className="form-control form-control-sm" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="username" style={{ borderRadius: 6 }} />
                                </div>
                                <div className="col-sm-3">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Password</label>
                                    <input className="form-control form-control-sm" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="password" style={{ borderRadius: 6 }} />
                                </div>
                                <div className="col-sm-3">
                                    <label style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>Role / Akses</label>
                                    <select className="form-control form-control-sm" value={newRole} onChange={(e) => setNewRole(e.target.value)} style={{ borderRadius: 6 }}>
                                        <option value="ADMIN">Admin</option>
                                        <option value="USER_VIP">VIP</option>
                                        <option value="USER">User</option>
                                    </select>
                                </div>
                                <div className="col-sm-2 d-flex gap-2">
                                    <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending} style={{ padding: "5px 12px", borderRadius: 6, border: "none", backgroundColor: "#2b4c3d", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: 1 }}>
                                        {addMutation.isPending ? "..." : "Simpan"}
                                    </button>
                                    <button onClick={() => setShowAddForm(false)} style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#475569", fontSize: 12, cursor: "pointer" }}>Batal</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {isLoading ? (
                        <div style={{ textAlign: "center", padding: 24, color: "#94a3b8" }}>Memuat data pengguna...</div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 6px", fontSize: 13 }}>
                                <thead>
                                    <tr style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                        <th style={{ padding: "4px 12px", fontWeight: 700 }}>#</th>
                                        <th style={{ padding: "4px 12px", fontWeight: 700 }}>Username</th>
                                        <th style={{ padding: "4px 12px", fontWeight: 700 }}>Hak Akses</th>
                                        <th style={{ padding: "4px 12px", fontWeight: 700 }}>Dibuat</th>
                                        <th style={{ padding: "4px 12px", fontWeight: 700 }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user, idx) => {
                                        const badge = ROLE_LABELS[user.role] ?? { label: user.role, bg: "#e2e8f0", color: "#475569" };
                                        const isEditing = editUser?.id === user.id;
                                        return (
                                            <tr key={user.id} style={{ backgroundColor: "#fafafa", borderRadius: 8 }}>
                                                <td style={{ padding: "10px 12px", borderRadius: "8px 0 0 8px", color: "#94a3b8" }}>{idx + 1}</td>
                                                <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1e293b" }}>{user.username}</td>
                                                <td style={{ padding: "10px 12px" }}>
                                                    <span style={{ backgroundColor: badge.bg, color: badge.color, padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 11 }}>
                                                    {new Date(user.createdAt).toLocaleDateString("id-ID")}
                                                </td>
                                                <td style={{ padding: "10px 12px", borderRadius: "0 8px 8px 0" }}>
                                                    {isEditing ? (
                                                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                                            <select value={editRole} onChange={(e) => setEditRole(e.target.value)} className="form-control form-control-sm" style={{ width: 120, borderRadius: 6 }}>
                                                                <option value="ADMIN">Admin</option>
                                                                <option value="USER_VIP">VIP</option>
                                                                <option value="USER">User</option>
                                                            </select>
                                                            <input type="password" placeholder="Password baru (opsional)" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} className="form-control form-control-sm" style={{ width: 160, borderRadius: 6 }} />
                                                            <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} style={{ padding: "4px 10px", borderRadius: 6, border: "none", backgroundColor: "#2b4c3d", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                                                Simpan
                                                            </button>
                                                            <button onClick={() => setEditUser(null)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#475569", fontSize: 11, cursor: "pointer" }}>
                                                                Batal
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: "flex", gap: 6 }}>
                                                            <button onClick={() => { setEditUser(user); setEditRole(user.role); setEditPassword(""); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e2e8f0", backgroundColor: "#fff", color: "#2b4c3d", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                                                Edit
                                                            </button>
                                                            <button onClick={() => setConfirmDeleteUser(user)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #fecaca", backgroundColor: "#fff", color: "#dc2626", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                                                Hapus
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm delete modal */}
            {confirmDeleteUser && (
                <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
                    <div style={{ backgroundColor: "#fff", borderRadius: 12, padding: 28, maxWidth: 380, width: "90%", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b", marginBottom: 6 }}>Hapus Pengguna?</div>
                        <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
                            Akun <strong style={{ color: "#dc2626" }}>{confirmDeleteUser.username}</strong> akan dihapus permanen.
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button onClick={() => setConfirmDeleteUser(null)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "1px solid #e2e8f0", backgroundColor: "#f8fafc", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>Batal</button>
                            <button onClick={() => deleteMutation.mutate(confirmDeleteUser.id)} disabled={deleteMutation.isPending} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", backgroundColor: "#dc2626", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                                {deleteMutation.isPending ? "..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
