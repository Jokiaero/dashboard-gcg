"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type DashboardSettingsResponse = {
    dashboardTitle: string;
    dashboardSubtitle: string;
    kajian2025: string;
    kajian2024: string;
    isoNote: string;
    penghargaanNote: string;
    gcgScores: Array<{ year: string; value: number }>;
};

type GcgScoreRow = { year: string; value: string };

export default function SettingsForm() {
    const queryClient = useQueryClient();
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [dashboardMessage, setDashboardMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [dashboardTitle, setDashboardTitle] = useState("");
    const [dashboardSubtitle, setDashboardSubtitle] = useState("");
    const [kajian2025, setKajian2025] = useState("");
    const [kajian2024, setKajian2024] = useState("");
    const [isoNote, setIsoNote] = useState("");
    const [penghargaanNote, setPenghargaanNote] = useState("");
    const [gcgScoreRows, setGcgScoreRows] = useState<GcgScoreRow[]>([{ year: "", value: "" }]);

    const { data: userSession, isLoading } = useQuery({
        queryKey: ["userSession"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me");
            if (!res.ok) throw new Error("Gagal mengambil sesi");
            return res.json();
        }
    });

    const canEditDashboard = userSession?.role === "SUPERADMIN" || userSession?.role === "STAFF";

    const { data: dashboardSettings } = useQuery<DashboardSettingsResponse>({
        queryKey: ["dashboardSettings"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/settings");
            if (!res.ok) throw new Error("Gagal mengambil pengaturan dashboard");
            return res.json();
        },
        enabled: canEditDashboard,
        staleTime: 30000,
    });

    useEffect(() => {
        if (!dashboardSettings) {
            return;
        }

        setDashboardTitle(dashboardSettings.dashboardTitle || "");
        setDashboardSubtitle(dashboardSettings.dashboardSubtitle || "");
        setKajian2025(dashboardSettings.kajian2025 || "");
        setKajian2024(dashboardSettings.kajian2024 || "");
        setIsoNote(dashboardSettings.isoNote || "");
        setPenghargaanNote(dashboardSettings.penghargaanNote || "");

        const normalizedRows = (dashboardSettings.gcgScores || []).map((row) => ({
            year: String(row.year ?? ""),
            value: String(row.value ?? ""),
        }));

        setGcgScoreRows(normalizedRows.length > 0 ? normalizedRows : [{ year: "", value: "" }]);
    }, [dashboardSettings]);

    const passwordMutation = useMutation({
        mutationFn: async () => {
            if (newPassword !== confirmPassword) {
                throw new Error("Password baru dan konfirmasi tidak cocok!");
            }
            
            const res = await fetch("/api/user/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengubah password");
            return data;
        },
        onSuccess: () => {
            setMessage({ type: 'success', text: "Password berhasil diperbarui!" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        },
        onError: (err: Error) => {
            setMessage({ type: 'error', text: err.message });
        }
    });

    const dashboardMutation = useMutation({
        mutationFn: async () => {
            const parsedScores = gcgScoreRows.map((row) => ({
                year: row.year.trim(),
                value: Number(row.value),
            }));

            if (parsedScores.some((row) => !row.year || Number.isNaN(row.value))) {
                throw new Error("Semua baris GCG Score wajib diisi year dan value yang valid");
            }

            const res = await fetch("/api/dashboard/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    dashboardTitle,
                    dashboardSubtitle,
                    kajian2025,
                    kajian2024,
                    isoNote,
                    penghargaanNote,
                    gcgScores: parsedScores,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal menyimpan pengaturan dashboard");
            }

            return data;
        },
        onSuccess: async () => {
            setDashboardMessage({ type: "success", text: "Pengaturan dashboard berhasil diperbarui." });
            await queryClient.invalidateQueries({ queryKey: ["dashboardSettings"] });
        },
        onError: (err: Error) => {
            setDashboardMessage({ type: "error", text: err.message });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        passwordMutation.mutate();
    };

    const handleDashboardSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setDashboardMessage(null);
        dashboardMutation.mutate();
    };

    const handleScoreChange = (index: number, field: "year" | "value", value: string) => {
        setGcgScoreRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
    };

    const addScoreRow = () => {
        setGcgScoreRows((prev) => [...prev, { year: "", value: "" }]);
    };

    const removeScoreRow = (index: number) => {
        setGcgScoreRows((prev) => {
            if (prev.length === 1) {
                return [{ year: "", value: "" }];
            }

            return prev.filter((_, i) => i !== index);
        });
    };

    if (isLoading) return <p>Loading...</p>;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                <div className="flex items-start gap-6 border-b border-slate-100 pb-8 mb-8">
                    <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center shrink-0 relative overflow-hidden group cursor-pointer">
                        <img src="/assets/images/faces/face28.png" alt="Profile" className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                            <i className="ti-camera text-white text-xl mb-1"></i>
                            <span className="text-white text-[10px] font-medium tracking-wider uppercase">Ganti</span>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 capitalize">{userSession?.username}</h2>
                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold uppercase tracking-wider">
                            <i className="ti-medall"></i> {userSession?.role}
                        </div>
                        <p className="text-slate-500 mt-2 text-sm max-w-md">Kelola informasi profil dan keamanan akun Anda untuk memastikan pengalaman yang personal dan aman.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800 border-l-4 border-[#2b4c3d] pl-3">Ubah Kata Sandi (Password)</h3>
                    
                    {message && (
                        <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            <i className={`mr-2 ${message.type === 'success' ? 'ti-check' : 'ti-alert'}`}></i>
                            {message.text}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="form-group">
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Password Saat Ini</label>
                            <input 
                                type="password" 
                                className="form-control" 
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required 
                            />
                        </div>
                        <div className="row">
                            <div className="col-md-6 form-group mb-md-0">
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Password Baru</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required 
                                />
                            </div>
                            <div className="col-md-6 form-group mb-0">
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Konfirmasi Password Baru</label>
                                <input 
                                    type="password" 
                                    className="form-control" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={passwordMutation.isPending}
                            className="bg-[#2b4c3d] hover:bg-[#1e362b] text-white px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                        >
                            {passwordMutation.isPending ? (
                                <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan...</>
                            ) : (
                                <><i className="ti-save"></i> Simpan Perubahan</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {canEditDashboard && (
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 border-l-4 border-[#2b4c3d] pl-3 mb-6">Pengaturan Dashboard (Admin/Staff)</h3>

                    {dashboardMessage && (
                        <div className={`mb-4 p-4 rounded-lg text-sm font-medium ${dashboardMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                            <i className={`mr-2 ${dashboardMessage.type === 'success' ? 'ti-check' : 'ti-alert'}`}></i>
                            {dashboardMessage.text}
                        </div>
                    )}

                    <form onSubmit={handleDashboardSubmit} className="space-y-4">
                        <div className="row">
                            <div className="col-md-6 form-group mb-3">
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Judul Dashboard</label>
                                <input className="form-control" value={dashboardTitle} onChange={(e) => setDashboardTitle(e.target.value)} required />
                            </div>
                            <div className="col-md-6 form-group mb-3">
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Subjudul Dashboard</label>
                                <input className="form-control" value={dashboardSubtitle} onChange={(e) => setDashboardSubtitle(e.target.value)} required />
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6 form-group mb-3">
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Kajian GCG 2025</label>
                                <input className="form-control" value={kajian2025} onChange={(e) => setKajian2025(e.target.value)} placeholder="Contoh: 100%" required />
                            </div>
                            <div className="col-md-6 form-group mb-3">
                                <label className="text-sm font-medium text-slate-700 mb-1 block">Kajian GCG 2024</label>
                                <input className="form-control" value={kajian2024} onChange={(e) => setKajian2024(e.target.value)} placeholder="Contoh: 98%" required />
                            </div>
                        </div>

                        <div className="form-group mb-3">
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Catatan ISO</label>
                            <input className="form-control" value={isoNote} onChange={(e) => setIsoNote(e.target.value)} required />
                        </div>

                        <div className="form-group mb-3">
                            <label className="text-sm font-medium text-slate-700 mb-1 block">Catatan Penghargaan</label>
                            <input className="form-control" value={penghargaanNote} onChange={(e) => setPenghargaanNote(e.target.value)} required />
                        </div>

                        <div className="form-group mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="text-sm font-medium text-slate-700 mb-0">GCG Score (Tahun & Nilai)</label>
                                <button type="button" className="btn btn-sm btn-outline-success" onClick={addScoreRow}>
                                    <i className="ti-plus"></i> Tambah Baris
                                </button>
                            </div>

                            <div className="table-responsive" style={{ border: "1px solid #e2e8f0", borderRadius: 8 }}>
                                <table className="table table-sm mb-0">
                                    <thead style={{ backgroundColor: "#f8fafc" }}>
                                        <tr>
                                            <th style={{ width: "40%" }}>Tahun</th>
                                            <th style={{ width: "40%" }}>Nilai</th>
                                            <th style={{ width: "20%" }}>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gcgScoreRows.map((row, index) => (
                                            <tr key={`${index}-${row.year}`}>
                                                <td>
                                                    <input
                                                        className="form-control form-control-sm"
                                                        value={row.year}
                                                        onChange={(e) => handleScoreChange(index, "year", e.target.value)}
                                                        placeholder="Contoh: 2024"
                                                        required
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        className="form-control form-control-sm"
                                                        value={row.value}
                                                        onChange={(e) => handleScoreChange(index, "value", e.target.value)}
                                                        placeholder="Contoh: 92.84"
                                                        required
                                                    />
                                                </td>
                                                <td>
                                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeScoreRow(index)}>
                                                        <i className="ti-trash"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="pt-2 d-flex justify-content-end">
                            <button
                                type="submit"
                                disabled={dashboardMutation.isPending}
                                className="bg-[#2b4c3d] hover:bg-[#1e362b] text-white px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
                            >
                                {dashboardMutation.isPending ? (
                                    <><span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan Dashboard...</>
                                ) : (
                                    <><i className="ti-save"></i> Simpan Pengaturan Dashboard</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
