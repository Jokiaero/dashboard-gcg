"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UserSessionResponse = {
    id: number;
    username: string;
    role: string;
    profileImage?: string;
};

type ProfileImageResponse = {
    success: boolean;
    profileImage: string;
    error?: string;
};

type DashboardSettingsResponse = {
    dashboardTitle: string;
    dashboardSubtitle: string;
    kajian2025: string;
    kajian2024: string;
    isoNote: string;
    penghargaanNote: string;
    penghargaanUrl: string;
    penghargaanUrls?: string[];
    gcgScores: Array<{ year: string; value: number }>;
};

type GcgScoreRow = { year: string; value: string };

const DEFAULT_PROFILE_IMAGE = "/assets/images/faces/face28.png";

function getProfileInitials(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
        return "AD";
    }

    const parts = normalizedName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

type PasswordMutationResponse = {
    success?: boolean;
};

export default function SettingsForm() {
    const queryClient = useQueryClient();
    const avatarInputRef = useRef<HTMLInputElement | null>(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [avatarMessage, setAvatarMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [dashboardMessage, setDashboardMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [avatarLoadError, setAvatarLoadError] = useState(false);

    const [dashboardTitle, setDashboardTitle] = useState("");
    const [dashboardSubtitle, setDashboardSubtitle] = useState("");
    const [kajian2025, setKajian2025] = useState("");
    const [kajian2024, setKajian2024] = useState("");
    const [isoNote, setIsoNote] = useState("");
    const [penghargaanNote, setPenghargaanNote] = useState("");
    const [penghargaanUrl, setPenghargaanUrl] = useState("");
    const [penghargaanUrls, setPenghargaanUrls] = useState<string[]>([""]);
    const [gcgScoreRows, setGcgScoreRows] = useState<GcgScoreRow[]>([{ year: "", value: "" }]);

    const { data: userSession, isLoading } = useQuery<UserSessionResponse>({
        queryKey: ["userSession"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me");
            if (!res.ok) {
                throw new Error("Gagal mengambil sesi");
            }
            return res.json();
        },
    });

    const canEditDashboard = userSession?.role === "ADMIN";

    const { data: dashboardSettings } = useQuery<DashboardSettingsResponse>({
        queryKey: ["dashboardSettings"],
        queryFn: async () => {
            const res = await fetch("/api/dashboard/settings");
            if (!res.ok) {
                throw new Error("Gagal mengambil pengaturan dashboard");
            }
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
        setPenghargaanUrl(dashboardSettings.penghargaanUrl || "");
        const loadedPenghargaanUrls = Array.isArray(dashboardSettings.penghargaanUrls)
            ? dashboardSettings.penghargaanUrls.map((url) => String(url || ""))
            : [String(dashboardSettings.penghargaanUrl || "")];
        setPenghargaanUrls(loadedPenghargaanUrls.length > 0 ? loadedPenghargaanUrls : [""]);

        const normalizedRows = (dashboardSettings.gcgScores || []).map((row) => ({
            year: String(row.year ?? ""),
            value: String(row.value ?? ""),
        }));

        setGcgScoreRows(normalizedRows.length > 0 ? normalizedRows : [{ year: "", value: "" }]);
    }, [dashboardSettings]);

    useEffect(() => {
        setAvatarLoadError(false);
    }, [userSession?.profileImage]);

    const passwordMutation = useMutation<PasswordMutationResponse, Error>({
        mutationFn: async () => {
            const currentPasswordTrimmed = currentPassword.trim();
            const newPasswordTrimmed = newPassword.trim();
            const confirmPasswordTrimmed = confirmPassword.trim();

            if (!currentPasswordTrimmed || !newPasswordTrimmed || !confirmPasswordTrimmed) {
                throw new Error("Isi Password Saat Ini, Password Baru, dan Konfirmasi Password Baru.");
            }

            if (newPasswordTrimmed !== confirmPasswordTrimmed) {
                throw new Error("Password baru dan konfirmasi tidak cocok!");
            }

            const res = await fetch("/api/user/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    currentPassword: currentPasswordTrimmed,
                    newPassword: newPasswordTrimmed,
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Gagal mengubah password");
            }

            return data;
        },
        onSuccess: () => {
            setMessage({ type: "success", text: "Password berhasil diperbarui!" });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        },
        onError: (err: Error) => {
            setMessage({ type: "error", text: err.message });
        },
    });

    const uploadAvatarMutation = useMutation<ProfileImageResponse, Error, File>({
        mutationFn: async (file) => {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/user/profile-image", {
                method: "POST",
                body: formData,
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Gagal mengunggah foto profil");
            }

            return result;
        },
        onSuccess: async (result) => {
            setAvatarMessage({ type: "success", text: "Foto profil berhasil diperbarui." });
            queryClient.setQueryData<UserSessionResponse | undefined>(["userSession"], (previous) => {
                if (!previous) {
                    return previous;
                }

                return {
                    ...previous,
                    profileImage: result.profileImage,
                };
            });
            setAvatarLoadError(false);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["userSession"] }),
                queryClient.invalidateQueries({ queryKey: ["navbarUserProfile"] }),
            ]);
        },
        onError: (error) => {
            setAvatarMessage({ type: "error", text: error.message });
        },
    });

    const deleteAvatarMutation = useMutation<ProfileImageResponse, Error>({
        mutationFn: async () => {
            const response = await fetch("/api/user/profile-image", {
                method: "DELETE",
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Gagal menghapus foto profil");
            }

            return result;
        },
        onSuccess: async () => {
            setAvatarMessage({ type: "success", text: "Foto profil dihapus. Avatar berubah ke inisial nama." });
            queryClient.setQueryData<UserSessionResponse | undefined>(["userSession"], (previous) => {
                if (!previous) {
                    return previous;
                }

                return {
                    ...previous,
                    profileImage: undefined,
                };
            });
            setAvatarLoadError(false);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["userSession"] }),
                queryClient.invalidateQueries({ queryKey: ["navbarUserProfile"] }),
            ]);
        },
        onError: (error) => {
            setAvatarMessage({ type: "error", text: error.message });
        },
    });

    const dashboardMutation = useMutation({
        mutationFn: async () => {
            const parsedScores = gcgScoreRows.map((row) => ({
                year: row.year.trim(),
                value: Number(row.value),
            }));
            const mergedPenghargaanUrls = [...penghargaanUrls];
            if (mergedPenghargaanUrls.length === 0) {
                mergedPenghargaanUrls.push("");
            }
            mergedPenghargaanUrls[0] = penghargaanUrl.trim();

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
                    penghargaanUrl,
                    penghargaanUrls: mergedPenghargaanUrls,
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

    const handleAvatarPickerOpen = () => {
        setAvatarMessage(null);
        avatarInputRef.current?.click();
    };

    const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        event.target.value = "";

        if (!selectedFile) {
            return;
        }

        setAvatarMessage(null);
        uploadAvatarMutation.mutate(selectedFile);
    };

    const handleDeleteAvatar = () => {
        setAvatarMessage(null);
        deleteAvatarMutation.mutate();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);

        const hasAnyPasswordInput = [currentPassword, newPassword, confirmPassword].some(
            (value) => value.trim().length > 0
        );

        if (!hasAnyPasswordInput) {
            setMessage({
                type: "success",
                text: "Foto profil sudah tersimpan. Isi field password hanya jika ingin mengganti kata sandi.",
            });
            return;
        }

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

    if (isLoading) {
        return <p>Loading...</p>;
    }

    const displayUsername = userSession?.username || "Pengguna";
    const roleLabel =
        userSession?.role === "ADMIN"
            ? "Admin"
            : userSession?.role === "USER_VIP"
              ? "VIP"
              : "User";
    const avatarBusy = uploadAvatarMutation.isPending || deleteAvatarMutation.isPending;
    const rawProfileImage = (userSession?.profileImage || "").trim();
    const hasCustomProfileImage = rawProfileImage.length > 0 && rawProfileImage !== DEFAULT_PROFILE_IMAGE;
    const showProfileImage = hasCustomProfileImage && !avatarLoadError;
    const profileInitials = getProfileInitials(displayUsername);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="row g-4 align-items-stretch">
                <div className="col-lg-4">
                    <div className="card shadow-sm h-100" style={{ borderRadius: 16, borderColor: "#e2e8f0" }}>
                        <div className="card-body p-4 d-flex flex-column">
                            <div className="text-center mb-3">
                                <h4 className="mb-1 text-slate-900">{displayUsername}</h4>
                                <p className="mb-0 text-slate-500">@{displayUsername.toLowerCase()}</p>
                            </div>

                            <div className="d-flex justify-content-center mb-4">
                                <div style={{ width: 130, height: 130 }}>
                                    {showProfileImage ? (
                                        <img
                                            src={rawProfileImage}
                                            alt="Foto profil"
                                            className="w-100 h-100 rounded-circle border border-4 border-white shadow"
                                            style={{ objectFit: "cover" }}
                                            onError={() => {
                                                setAvatarLoadError(true);
                                            }}
                                        />
                                    ) : (
                                        <div
                                            className="w-100 h-100 rounded-circle border border-4 border-white shadow"
                                            style={{
                                                backgroundColor: "#2b4c3d",
                                                color: "#ffffff",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                fontSize: 36,
                                                fontWeight: 700,
                                                letterSpacing: 1,
                                            }}
                                        >
                                            {profileInitials}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="d-flex justify-content-center mb-4">
                                <span
                                    className="badge"
                                    style={{ background: "#eef6f1", color: "#1e4a37", fontSize: 12, letterSpacing: 0.5 }}
                                >
                                    {roleLabel}
                                </span>
                            </div>

                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="d-none"
                                onChange={handleAvatarChange}
                            />

                            <button
                                type="button"
                                onClick={handleAvatarPickerOpen}
                                disabled={avatarBusy}
                                className="btn text-white mb-2"
                                style={{ backgroundColor: "#2b4c3d", borderColor: "#2b4c3d" }}
                            >
                                {uploadAvatarMutation.isPending ? "Mengunggah..." : "Ubah Foto Profil"}
                            </button>

                            <button
                                type="button"
                                onClick={handleDeleteAvatar}
                                disabled={avatarBusy || !hasCustomProfileImage}
                                className="btn btn-outline-danger"
                            >
                                {deleteAvatarMutation.isPending ? "Menghapus..." : "Hapus Foto Profil"}
                            </button>

                            <p className="text-muted small mt-3 mb-0 text-center">
                                Format JPG, PNG, WEBP. Ukuran maksimal 3MB.
                            </p>

                            {avatarMessage && (
                                <div
                                    className={`mt-3 p-3 rounded-3 text-sm ${
                                        avatarMessage.type === "success"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                    }`}
                                >
                                    {avatarMessage.text}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card shadow-sm" style={{ borderRadius: 16, borderColor: "#e2e8f0" }}>
                        <div className="card-body p-4 p-lg-5">
                            <h3 className="mb-2 text-slate-900">Edit Profile</h3>
                            <p className="text-slate-500 mb-4">Kelola informasi akun dan keamanan Anda.</p>

                            <div className="d-flex align-items-center gap-4 border-bottom mb-4" style={{ borderColor: "#e2e8f0" }}>
                                <button
                                    type="button"
                                    className="btn btn-link p-0 pb-2"
                                    style={{ color: "#1e4a37", borderBottom: "2px solid #1e4a37", textDecoration: "none", fontWeight: 600 }}
                                >
                                    User Info
                                </button>
                            </div>

                            {message && (
                                <div
                                    className={`mb-4 p-4 rounded-lg text-sm font-medium ${
                                        message.type === "success"
                                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                            : "bg-rose-50 text-rose-700 border border-rose-200"
                                    }`}
                                >
                                    {message.text}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="row g-3">
                                    <div className="col-md-6 form-group mb-0">
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Nama Lengkap</label>
                                        <input className="form-control" value={displayUsername} readOnly />
                                    </div>
                                    <div className="col-md-6 form-group mb-0">
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Username</label>
                                        <input className="form-control" value={displayUsername} readOnly />
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6 form-group mb-0">
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Password Saat Ini</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                        />
                                    </div>
                                    <div className="col-md-6 form-group mb-0">
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Password Baru</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="row g-3">
                                    <div className="col-md-6 form-group mb-0">
                                        <label className="text-sm font-medium text-slate-700 mb-1 block">Konfirmasi Password Baru</label>
                                        <input
                                            type="password"
                                            className="form-control"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <p className="text-muted mb-0" style={{ fontSize: 12 }}>
                                    Kosongkan semua field password jika tidak ingin mengganti kata sandi.
                                </p>

                                <div className="pt-3 d-flex justify-content-end">
                                    <button
                                        type="submit"
                                        disabled={passwordMutation.isPending}
                                        className="bg-[#2b4c3d] hover:bg-[#1e362b] text-white px-6 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        {passwordMutation.isPending ? "Menyimpan..." : "Simpan Password"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {canEditDashboard && (
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800 border-l-4 border-[#2b4c3d] pl-3 mb-6">Pengaturan Dashboard (Admin)</h3>

                    {dashboardMessage && (
                        <div className={`mb-4 p-4 rounded-lg text-sm font-medium ${dashboardMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
                            <i className={`mr-2 ${dashboardMessage.type === "success" ? "ti-check" : "ti-alert"}`}></i>
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
                            <textarea
                                className="form-control"
                                rows={3}
                                value={penghargaanNote}
                                onChange={(e) => setPenghargaanNote(e.target.value)}
                                placeholder="Isi satu baris untuk setiap poin penghargaan"
                                required
                            />
                        </div>

                        <div className="form-group mb-3">
                            <label className="text-sm font-medium text-slate-700 mb-1 block">URL Penghargaan (opsional)</label>
                            <input
                                className="form-control"
                                value={penghargaanUrl}
                                onChange={(e) => setPenghargaanUrl(e.target.value)}
                                placeholder="https://contoh.com/penghargaan"
                            />
                            <small className="text-muted">Jika diisi, URL ini ditambahkan ke daftar Penghargaan sebagai tautan otomatis.</small>
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
                                    <>
                                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Menyimpan Dashboard...
                                    </>
                                ) : (
                                    <>
                                        <i className="ti-save"></i> Simpan Pengaturan Dashboard
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
