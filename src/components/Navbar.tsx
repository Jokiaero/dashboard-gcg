"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

const pelaporanMenu = [
    {
        label: "Laporan WBS",
        description: "Laporan Rencana Implementasi Proyek",
        href: "/laporan-wbs",
        keywords: ["laporan", "wbs", "proyek"],
        iconClass: "icon-pie-graph",
        iconColor: "bg-blue-50 text-blue-600",
    },
    {
        label: "Laporan Profil Risiko Anti Penyuapan",
        description: "Profil risiko keuangan dan kepatuhan anti penyuapan",
        href: "/laporan-risiko-keuangan",
        keywords: ["laporan", "risiko", "profil", "penyuapan"],
        iconClass: "icon-shield",
        iconColor: "bg-amber-50 text-amber-600",
    },
    {
        label: "Laporan Monitoring Risiko Penyuapan",
        description: "Pemantauan tren risiko dan tindak lanjut mitigasi",
        href: "/laporan-monitoring-risiko-penyuapan",
        keywords: ["laporan", "monitoring", "risiko", "penyuapan"],
        iconClass: "icon-bar-graph",
        iconColor: "bg-orange-50 text-orange-600",
    },
    {
        label: "Laporan Hasil Implementasi PPG ke KPK",
        description: "Ringkasan progres implementasi program pelaporan gratifikasi",
        href: "/laporan-implementasi-ppg-kpk",
        keywords: ["laporan", "implementasi", "ppg", "kpk"],
        iconClass: "icon-paper",
        iconColor: "bg-emerald-50 text-emerald-600",
    },
    {
        label: "Laporan Survey Awareness GCG",
        description: "Hasil survey awareness dan evaluasi budaya kepatuhan",
        href: "/laporan-survey-awareness-gcg",
        keywords: ["laporan", "survey", "awareness", "gcg"],
        iconClass: "icon-check",
        iconColor: "bg-indigo-50 text-indigo-600",
    },
];

export default function Navbar() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [unreadCount, setUnreadCount] = useState(2);
    
    const { data: userSession } = useQuery({
        queryKey: ["userSession"],
        queryFn: async () => {
            const res = await fetch("/api/auth/me");
            if (!res.ok) return null;
            return res.json();
        }
    });

    // Simulate search results based on query length
    const isSearching = searchQuery.length > 0;
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const pelaporanSearchResults = pelaporanMenu.filter((item) =>
        item.keywords.some((keyword) => keyword.includes(normalizedQuery) || normalizedQuery.includes(keyword)) ||
        item.label.toLowerCase().includes(normalizedQuery)
    );
    
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
    };

    const performSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQuery.trim() !== '') {
            router.push('/kajian-internal');
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
                <button className="navbar-toggler navbar-toggler align-self-center" type="button" data-toggle="minimize">
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
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
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
                                
                                {(pelaporanSearchResults.length > 0 || normalizedQuery.includes("laporan")) ? (
                                    pelaporanMenu
                                        .filter((item) => {
                                            if (normalizedQuery.includes("laporan")) {
                                                return true;
                                            }

                                            return pelaporanSearchResults.some((result) => result.label === item.label);
                                        })
                                        .map((item) => (
                                            <div
                                                key={item.label}
                                                className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-start gap-3"
                                                onClick={() => {
                                                    router.push(item.href);
                                                    setSearchQuery("");
                                                    setIsSearchFocused(false);
                                                }}
                                            >
                                                <div className={`w-8 h-8 rounded-full ${item.iconColor} flex items-center justify-center shrink-0`}>
                                                    <i className={item.iconClass}></i>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-medium text-slate-900">{item.label}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{item.description}</div>
                                                </div>
                                            </div>
                                        ))
                                ) : (
                                    <>
                                        <div 
                                            className="p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors flex items-start gap-3"
                                            onClick={() => router.push('/kajian-internal')}
                                        >
                                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                                <i className="icon-search"></i>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">Pencarian "{searchQuery}" di Kajian Internal</div>
                                                <div className="text-xs text-slate-500 mt-0.5">Tampilkan hasil dari pengetahuan internal GCG.</div>
                                            </div>
                                        </div>
                                    </>
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
                        <a className="nav-link dropdown-toggle cursor-pointer" onClick={handleProfileClick}>
                            <img src="/assets/images/faces/face28.png" alt="profile" width={30} height={30} className={showProfile ? "ring-2 ring-[#2b4c3d]" : ""} />
                        </a>
                        
                        {showProfile && (
                            <div className="dropdown-menu dropdown-menu-right navbar-dropdown show" style={{ display: 'block', position: 'absolute', top: '100%', right: '0', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}>
                                <div className="px-4 py-3 border-b border-slate-100">
                                    <p className="text-sm font-bold text-slate-900 truncate uppercase">{userSession?.username || "Guest User"}</p>
                                    <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded mt-1 truncate">{userSession?.role || "GUEST"}</p>
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
