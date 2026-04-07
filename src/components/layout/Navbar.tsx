"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isVipRole, normalizeAppRole } from "@/lib/roles";

type SearchResultItem = {
    id: string;
    type: "menu" | "regulasi" | "assessment" | "dokumen" | "laporan";
    title: string;
    description: string;
    href: string;
    iconClass: string;
    iconColor: string;
};

type GlobalSearchResponse = {
    query: string;
    results: SearchResultItem[];
    minChars?: number;
};

type NavbarUserResponse = {
    id: number;
    username: string;
    role: string;
    profileImage?: string;
};

type ProfileImageUploadResponse = {
    success: boolean;
    profileImage: string;
};

type ProfileImageDeleteResponse = {
    success: boolean;
    profileImage: string;
};

const DEFAULT_PROFILE_IMAGE = "/assets/images/faces/face28.png";

function isExternalUrl(value: string) {
    return /^https?:\/\//i.test(value);
}

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

function toTitleCase(value: string) {
    return value
        .replace(/_/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((word) => {
            if (word.length <= 2 && word === word.toUpperCase()) {
                return word;
            }
            return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
        })
        .join(" ");
}

function formatRoleLabel(role: string) {
    const normalizedRole = normalizeAppRole(role);
    if (normalizedRole === "ADMIN") return "Admin";
    if (normalizedRole === "USER_VIP") return "User Vip";
    return "User";
}

type QuickModuleItem = SearchResultItem & {
    keywords: string[];
};

const QUICK_MODULE_ITEMS: QuickModuleItem[] = [
    {
        id: "quick-dashboard",
        type: "menu",
        title: "Dashboard",
        description: "Ringkasan performa GCG",
        href: "/",
        iconClass: "icon-grid",
        iconColor: "bg-slate-100 text-slate-700",
        keywords: ["dashboard", "ringkasan", "utama"],
    },
    {
        id: "quick-regulasi",
        type: "menu",
        title: "Katalog Regulasi",
        description: "Daftar dokumen regulasi BUMN",
        href: "/regulasi",
        iconClass: "icon-book",
        iconColor: "bg-blue-50 text-blue-600",
        keywords: ["regulasi", "peraturan", "bumn", "menteri"],
    },
    {
        id: "quick-laporan-wbs",
        type: "menu",
        title: "Laporan WBS",
        description: "Whistleblowing System",
        href: "/laporan-wbs",
        iconClass: "icon-pie-graph",
        iconColor: "bg-blue-50 text-blue-600",
        keywords: ["laporan", "wbs", "pelaporan"],
    },
    {
        id: "quick-laporan-risiko",
        type: "menu",
        title: "Laporan Profil Risiko Anti Penyuapan",
        description: "Profil risiko dan kepatuhan",
        href: "/laporan-risiko-keuangan",
        iconClass: "icon-shield",
        iconColor: "bg-amber-50 text-amber-600",
        keywords: ["laporan", "risiko", "penyuapan"],
    },
    {
        id: "quick-laporan-monitoring",
        type: "menu",
        title: "Laporan Monitoring Risiko Penyuapan",
        description: "Pemantauan tren risiko",
        href: "/laporan-monitoring-risiko-penyuapan",
        iconClass: "icon-bar-graph",
        iconColor: "bg-orange-50 text-orange-600",
        keywords: ["laporan", "monitoring", "risiko"],
    },
    {
        id: "quick-laporan-ppg",
        type: "menu",
        title: "Laporan Hasil Implementasi PPG ke KPK",
        description: "Implementasi PPG",
        href: "/laporan-implementasi-ppg-kpk",
        iconClass: "icon-paper",
        iconColor: "bg-emerald-50 text-emerald-600",
        keywords: ["laporan", "ppg", "kpk"],
    },
    {
        id: "quick-laporan-survey",
        type: "menu",
        title: "Laporan Survey Awareness GCG",
        description: "Hasil survey awareness",
        href: "/laporan-survey-awareness-gcg",
        iconClass: "icon-check",
        iconColor: "bg-indigo-50 text-indigo-600",
        keywords: ["laporan", "survey", "awareness", "gcg"],
    },
    {
        id: "quick-kajian",
        type: "menu",
        title: "Kajian Internal GCG",
        description: "Dokumen kajian internal",
        href: "/kajian-internal",
        iconClass: "icon-search",
        iconColor: "bg-cyan-50 text-cyan-600",
        keywords: ["kajian", "internal", "dokumen"],
    },
    {
        id: "quick-approval",
        type: "menu",
        title: "Approval Pernyataan Kepatuhan",
        description: "Statistik approval kepatuhan",
        href: "/approval-pernyataan-kepatuhan",
        iconClass: "icon-check",
        iconColor: "bg-teal-50 text-teal-600",
        keywords: ["approval", "kepatuhan", "pernyataan"],
    },
    {
        id: "quick-assessment",
        type: "menu",
        title: "Assessment GCG",
        description: "Penilaian tata kelola",
        href: "/assessment-gcg",
        iconClass: "icon-bar-graph",
        iconColor: "bg-violet-50 text-violet-600",
        keywords: ["assessment", "gcg", "penilaian"],
    },
    {
        id: "quick-sertifikasi",
        type: "assessment",
        title: "Sertifikasi ISO 37001",
        description: "Sertifikat SMAP",
        href: "/assessment/sertifikasi-iso-37001",
        iconClass: "icon-bar-graph",
        iconColor: "bg-violet-50 text-violet-600",
        keywords: ["sertifikasi", "iso", "37001", "smap"],
    },
    {
        id: "quick-berita-gcg",
        type: "menu",
        title: "Berita GCG",
        description: "Katalog berita dan dokumentasi GCG",
        href: "/berita-gcg",
        iconClass: "icon-head",
        iconColor: "bg-yellow-50 text-yellow-700",
        keywords: ["berita", "gcg", "penghargaan", "award", "apresiasi"],
    },
];

const USER_HIDDEN_QUICK_PATHS = new Set([
    "/approval-pernyataan-kepatuhan",
    "/assessment-gcg",
    "/assessment/sertifikasi-iso-37001",
]);

export default function Navbar({ initialRole = "USER", initialUsername = "User" }: { initialRole?: string, initialUsername?: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [unreadCount, setUnreadCount] = useState(2);
    const [avatarMessage, setAvatarMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [avatarLoadError, setAvatarLoadError] = useState(false);

    const { data: navbarUser } = useQuery<NavbarUserResponse>({
        queryKey: ["navbarUserProfile"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me");
            if (!res.ok) {
                throw new Error("Gagal memuat profil pengguna");
            }
            return res.json();
        },
        staleTime: 60_000,
    });

    const uploadAvatarMutation = useMutation<ProfileImageUploadResponse, Error, File>({
        mutationFn: async (file: File) => {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/user/profile-image", {
                method: "POST",
                body: formData,
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || "Gagal mengunggah foto profil");
            }

            return json;
        },
        onSuccess: (data) => {
            queryClient.setQueryData<NavbarUserResponse | undefined>(["navbarUserProfile"], (prev) => {
                if (!prev) return prev;
                return { ...prev, profileImage: data.profileImage };
            });
            queryClient.invalidateQueries({ queryKey: ["navbarUserProfile"] });
            queryClient.invalidateQueries({ queryKey: ["userSession"] });
            setAvatarLoadError(false);
            setAvatarMessage({ ok: true, text: "Foto profil berhasil diperbarui" });
        },
        onError: (error) => {
            setAvatarMessage({ ok: false, text: error.message });
        },
    });

    const deleteAvatarMutation = useMutation<ProfileImageDeleteResponse, Error>({
        mutationFn: async () => {
            const res = await fetch("/api/user/profile-image", {
                method: "DELETE",
            });

            const json = await res.json();
            if (!res.ok) {
                throw new Error(json.error || "Gagal menghapus foto profil");
            }

            return json;
        },
        onSuccess: () => {
            queryClient.setQueryData<NavbarUserResponse | undefined>(["navbarUserProfile"], (prev) => {
                if (!prev) return prev;
                return { ...prev, profileImage: undefined };
            });
            queryClient.invalidateQueries({ queryKey: ["navbarUserProfile"] });
            queryClient.invalidateQueries({ queryKey: ["userSession"] });
            setAvatarLoadError(false);
            setAvatarMessage({ ok: true, text: "Foto profil dihapus" });
        },
        onError: (error) => {
            setAvatarMessage({ ok: false, text: error.message });
        },
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(searchQuery.trim());
        }, 120);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setAvatarLoadError(false);
    }, [navbarUser?.profileImage]);

    const effectiveRole = normalizeAppRole(navbarUser?.role || initialRole);
    const canAccessPelaporan = isVipRole(effectiveRole);
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const isSearching = normalizedSearchQuery.length > 0;

    const quickModuleResults: SearchResultItem[] = isSearching
        ? QUICK_MODULE_ITEMS
              .filter((item) => {
                  if (!canAccessPelaporan && item.href.startsWith("/laporan-")) {
                      return false;
                  }
                  if (effectiveRole === "USER" && USER_HIDDEN_QUICK_PATHS.has(item.href)) {
                      return false;
                  }
                  const terms = normalizedSearchQuery.split(/\s+/).filter(Boolean);
                  return terms.every((term) =>
                      [item.title, item.description, ...item.keywords].some((value) =>
                          value.toLowerCase().includes(term)
                      )
                  );
              })
              .slice(0, 6)
              .map(({ keywords, ...item }) => item)
        : [];

    const { data: searchData, isFetching: isSearchLoading } = useQuery<GlobalSearchResponse>({
        queryKey: ["navbarGlobalSearch", debouncedQuery, effectiveRole],
        enabled: isSearchFocused && debouncedQuery.length >= 2,
        placeholderData: (previous) => previous,
        staleTime: 60_000,
        queryFn: async () => {
            const res = await fetch(`/api/search/global?q=${encodeURIComponent(debouncedQuery)}&limit=12`);
            if (!res.ok) throw new Error("Gagal memuat hasil pencarian");
            return res.json();
        },
    });

    const searchResults = searchData?.results || [];
    const dedupedResults = new Map<string, SearchResultItem>();
    [...quickModuleResults, ...searchResults].forEach((item) => {
        const key = `${item.href}::${item.title.toLowerCase()}`;
        if (!dedupedResults.has(key)) {
            dedupedResults.set(key, item);
        }
    });
    const mergedResults = Array.from(dedupedResults.values()).slice(0, 12);
    const topResult = mergedResults[0];
    const profileUsernameRaw = navbarUser?.username || initialUsername;
    const profileUsername = toTitleCase(profileUsernameRaw);
    const profileRoleLabel = formatRoleLabel(effectiveRole);
    const rawProfileImage = (navbarUser?.profileImage || "").trim();
    const hasCustomProfileImage = rawProfileImage.length > 0 && rawProfileImage !== DEFAULT_PROFILE_IMAGE;
    const profileImageSrc = hasCustomProfileImage ? rawProfileImage : "";
    const showProfileImage = hasCustomProfileImage && !avatarLoadError;
    const profileInitials = getProfileInitials(profileUsernameRaw);

    const navigateTo = (href: string) => {
        if (isExternalUrl(href)) {
            window.location.assign(href);
            return;
        }
        router.push(href);
    };
    
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    const handleNotificationClick = () => {
        setShowNotifications(!showNotifications);
        if (showProfile) setShowProfile(false);
        if (!showNotifications) setUnreadCount(0);
    };

    const handleProfileClick = () => {
        setShowProfile(!showProfile);
        if (showNotifications) setShowNotifications(false);
        setAvatarMessage(null);
    };

    const handleProfileImagePick = () => {
        setAvatarMessage(null);
        avatarInputRef.current?.click();
    };

    const handleProfileImageDelete = () => {
        setAvatarMessage(null);
        deleteAvatarMutation.mutate();
    };

    const handleSidebarMinimize = () => {
        const body = document.body;
        if (body.classList.contains("sidebar-toggle-display") || body.classList.contains("sidebar-absolute")) {
            body.classList.toggle("sidebar-hidden");
            return;
        }

        body.classList.toggle("sidebar-icon-only");
    };

    const onAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadAvatarMutation.mutate(file);
        }
        e.target.value = "";
    };

    const performSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && searchQuery.trim() !== "") {
            const targetPath = topResult?.href || `/kajian-internal?search=${encodeURIComponent(searchQuery.trim())}`;
            navigateTo(targetPath);
            setIsSearchFocused(false);
            setSearchQuery("");
        }
    };

    return (
        <nav className="navbar col-lg-12 col-12 p-0 fixed-top d-flex flex-row">
            <div className="text-center navbar-brand-wrapper d-flex align-items-center justify-content-start">
                <a className="navbar-brand brand-logo me-5" href="/">
                    <img
                        src="/assets/images/logo.png"
                        style={{ transform: "scale(1.7)", transformOrigin: "left center" }}
                        className="me-2"
                        alt="logo"
                        width={100}
                        height={30}
                    />
                </a>
                <a className="navbar-brand brand-logo-mini" href="/">
                    <img src="/assets/images/logo-mini.png" alt="logo" width={35} height={35} />
                </a>
            </div>
            
            <div className="navbar-menu-wrapper d-flex align-items-center justify-content-end">
                <button
                    className="navbar-toggler navbar-toggler align-self-center"
                    type="button"
                    data-toggle="minimize"
                    onClick={handleSidebarMinimize}
                >
                    <span className="icon-menu"></span>
                </button>
                
                <ul className="navbar-nav mr-lg-2 relative flex-grow-1" style={{ minWidth: 0 }}>
                    <li
                        className="nav-item nav-search d-none d-lg-block relative"
                        style={{ width: "clamp(320px, 42vw, 620px)", maxWidth: "100%" }}
                    >
                        <div className="input-group w-100" style={{ width: "100%" }}>
                            <div className="input-group-prepend hover-cursor" id="navbar-search-icon">
                                <span className="input-group-text" id="search">
                                    <i className="icon-search"></i>
                                </span>
                            </div>
                            <input
                                type="text"
                                className="form-control"
                                id="navbar-search-input"
                                placeholder="Cari Regulasi/Laporan"
                                aria-label="search"
                                aria-describedby="search"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 150)}
                                onKeyDown={performSearch}
                                style={{ minWidth: 0 }}
                            />
                        </div>
                        
                        {/* Search Dropdown Results */}
                        {isSearchFocused && isSearching && (
                            <div
                                className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-lg border border-slate-100 p-2 z-50"
                                style={{ width: "100%", maxWidth: 620 }}
                            >
                                <div className="p-2 text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-50 mb-2">
                                    Hasil Pencarian
                                </div>

                                {mergedResults.length > 0 ? (
                                    mergedResults.map((item) => (
                                            <div
                                                key={item.id}
                                                className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-start gap-3"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    navigateTo(item.href);
                                                    setSearchQuery("");
                                                    setIsSearchFocused(false);
                                                }}
                                            >
                                                <div className={`w-8 h-8 rounded-full ${item.iconColor} flex items-center justify-center shrink-0`}>
                                                    <i className={item.iconClass}></i>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{item.title}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                                                </div>
                                            </div>
                                        ))
                                ) : isSearchLoading ? (
                                    <div className="p-3 text-sm text-slate-500">Memuat hasil pencarian...</div>
                                ) : (
                                    <div className="p-3 text-sm text-slate-500">
                                        Data tidak ditemukan untuk "{searchQuery}".
                                    </div>
                                )}

                                {isSearchLoading && quickModuleResults.length > 0 && (
                                    <div className="px-3 pb-2 pt-1 text-xs text-slate-400 border-t border-slate-100">
                                        Menyempurnakan hasil dari data lainnya...
                                    </div>
                                )}
                            </div>
                        )}
                    </li>
                </ul>
                
                <ul className="navbar-nav navbar-nav-right">
                    <li className="nav-item dropdown relative">
                        <a
                            className="nav-link count-indicator dropdown-toggle cursor-pointer"
                            onClick={handleNotificationClick}
                        >
                            <i className="icon-bell mx-0"></i>
                            {unreadCount > 0 && <span className="count"></span>}
                        </a>
                        
                        {showNotifications && (
                            <div className="dropdown-menu dropdown-menu-right navbar-dropdown preview-list show" style={{ display: 'block', position: 'absolute', top: '100%', right: '0', clipPath: 'none', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                                <p className="mb-0 font-weight-normal float-left dropdown-header border-b border-slate-100 pb-3">Notifikasi Baru</p>
                                <a className="dropdown-item preview-item hover:bg-slate-50 transition-colors" onClick={() => router.push('/laporan-wbs')}>
                                    <div className="preview-thumbnail">
                                        <div className="preview-icon bg-success"><i className="ti-info-alt mx-0"></i></div>
                                    </div>
                                    <div className="preview-item-content">
                                        <h6 className="preview-subject font-weight-normal text-slate-900">Approval Laporan WBS</h6>
                                        <p className="font-weight-light small-text mb-0 text-slate-500">Direksi telah memberikan persetujuan.</p>
                                    </div>
                                </a>
                                <a className="dropdown-item preview-item hover:bg-slate-50 transition-colors" onClick={() => router.push('/kajian-internal')}>
                                    <div className="preview-thumbnail">
                                        <div className="preview-icon bg-warning"><i className="ti-settings mx-0"></i></div>
                                    </div>
                                    <div className="preview-item-content">
                                        <h6 className="preview-subject font-weight-normal text-slate-900">Dokumen Kebijakan Baru</h6>
                                        <p className="font-weight-light small-text mb-0 text-slate-500">Draft Anti Penyuapan (ISO) perlu ulasan.</p>
                                    </div>
                                </a>
                                <div className="p-3 text-center border-t border-slate-100">
                                    <span className="text-xs font-semibold text-[#2b4c3d] cursor-pointer hover:underline">Tandai semua dibaca</span>
                                </div>
                            </div>
                        )}
                    </li>
                    
                    <li className="nav-item nav-profile dropdown relative">
                        <a className="nav-link dropdown-toggle cursor-pointer d-flex align-items-center gap-3" onClick={handleProfileClick}>
                            <span
                                className="d-none d-md-inline"
                                style={{
                                    fontSize: 19,
                                    fontWeight: 600,
                                    color: "#334155",
                                    maxWidth: 180,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    letterSpacing: 0.1,
                                }}
                                title={profileUsername}
                            >
                                {profileUsername}
                            </span>
                            {showProfileImage ? (
                                <img
                                    src={profileImageSrc}
                                    alt="profile"
                                    width={42}
                                    height={42}
                                    className={showProfile ? "ring-2 ring-[#2b4c3d]" : ""}
                                    style={{
                                        objectFit: "cover",
                                        borderRadius: "50%",
                                        border: "2px solid #d1d5db",
                                        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
                                    }}
                                    onError={() => {
                                        setAvatarLoadError(true);
                                    }}
                                />
                            ) : (
                                <div
                                    className={showProfile ? "ring-2 ring-[#2b4c3d]" : ""}
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: "50%",
                                        backgroundColor: "#2b4c3d",
                                        color: "#ffffff",
                                        fontSize: 18,
                                        fontWeight: 700,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        letterSpacing: 0.3,
                                        border: "2px solid #d1d5db",
                                        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.12)",
                                    }}
                                >
                                    {profileInitials}
                                </div>
                            )}
                        </a>

                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            style={{ display: "none" }}
                            onChange={onAvatarFileChange}
                        />
                        
                        {showProfile && (
                            <div className="dropdown-menu dropdown-menu-right navbar-dropdown show" style={{ display: 'block', position: 'absolute', top: '100%', right: '0', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <div className="d-flex align-items-center gap-3">
                                        {showProfileImage ? (
                                            <img
                                                src={profileImageSrc}
                                                alt="Profile"
                                                width={52}
                                                height={52}
                                                style={{ objectFit: "cover", borderRadius: "50%", border: "2px solid #e2e8f0" }}
                                                onError={() => {
                                                    setAvatarLoadError(true);
                                                }}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    width: 52,
                                                    height: 52,
                                                    borderRadius: "50%",
                                                    border: "2px solid #e2e8f0",
                                                    backgroundColor: "#2b4c3d",
                                                    color: "#ffffff",
                                                    fontSize: 16,
                                                    fontWeight: 700,
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    letterSpacing: 0.6,
                                                }}
                                            >
                                                {profileInitials}
                                            </div>
                                        )}
                                        <div style={{ minWidth: 0 }}>
                                            <p className="text-sm font-bold text-slate-900 truncate mb-0">{profileUsername}</p>
                                            <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded mt-1 truncate mb-0">
                                                {profileRoleLabel}
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        className="btn btn-sm btn-outline-secondary mt-3 w-100"
                                        onClick={handleProfileImagePick}
                                        disabled={uploadAvatarMutation.isPending || deleteAvatarMutation.isPending}
                                        type="button"
                                    >
                                        <i className="ti-camera me-1"></i>
                                        {uploadAvatarMutation.isPending ? "Mengunggah..." : "Ganti Foto Profil"}
                                    </button>
                                    <button
                                        className="btn btn-sm btn-outline-danger mt-2 w-100"
                                        onClick={handleProfileImageDelete}
                                        disabled={uploadAvatarMutation.isPending || deleteAvatarMutation.isPending || !hasCustomProfileImage}
                                        type="button"
                                    >
                                        <i className="ti-trash me-1"></i>
                                        {deleteAvatarMutation.isPending ? "Menghapus..." : "Hapus Foto Profil"}
                                    </button>
                                    <p className="text-muted mb-0 mt-2" style={{ fontSize: 11 }}>
                                        Format JPG/PNG/WEBP, maksimal 3MB.
                                    </p>
                                    {avatarMessage && (
                                        <p
                                            className="mb-0 mt-2"
                                            style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: avatarMessage.ok ? "#15803d" : "#dc2626",
                                            }}
                                        >
                                            {avatarMessage.text}
                                        </p>
                                    )}
                                </div>
                                <button className="dropdown-item py-3 hover:bg-slate-50 transition-colors" onClick={() => router.push('/settings')}>
                                    <i className="ti-settings text-primary"></i> Pengaturan Akun
                                </button>
                                <button className="dropdown-item py-3 hover:bg-slate-50 transition-colors" onClick={handleLogout}>
                                    <i className="ti-power-off text-primary"></i> Logout
                                </button>
                            </div>
                        )}
                    </li>
                </ul>
                <button className="navbar-toggler navbar-toggler-right d-lg-none align-self-center" type="button" data-toggle="offcanvas">
                    <span className="icon-menu"></span>
                </button>
            </div>
        </nav>
    );
}
