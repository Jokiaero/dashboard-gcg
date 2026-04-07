"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { normalizeAppRole } from "@/lib/roles";

// ─── Role Definitions ─────────────────────────────────────────────────────────
// ADMIN       → Admin   : akses penuh + panel admin
// USER_VIP    → VIP     : akses semua halaman dashboard (termasuk pelaporan)
// USER        → Biasa   : akses dashboard terbatas + semua menu non-pelaporan

type NavChild = {
    href: string;
    label: string;
    external?: boolean;
    vipOnly?: boolean;
};

type NavChildGroup = {
    label: string;
    id: string;
    children: NavChild[];
    vipOnly?: boolean;
};

type NavItem = {
    href?: string;
    label: string;
    icon: string;
    id?: string;
    adminOnly?: boolean;
    vipOnly?: boolean;
    children?: (NavChild | NavChildGroup)[];
};

const navItems: NavItem[] = [
    { href: "/", label: "Dashboard", icon: "icon-grid" },
    { href: "/regulasi", label: "Regulasi", icon: "icon-book" },
    { href: "/softstructure", label: "Softstructure GCG", icon: "icon-layout" },
    {
        label: "Pelaporan",
        icon: "icon-paper",
        id: "pelaporan",
        vipOnly: true,
        children: [
            { href: "/laporan-wbs", label: "Laporan WBS" },
            { href: "/laporan-risiko-keuangan", label: "Laporan Profil Risiko Anti Penyuapan" },
            { href: "/laporan-monitoring-risiko-penyuapan", label: "Laporan Monitoring Risiko Penyuapan" },
            { href: "/laporan-implementasi-ppg-kpk", label: "Laporan Hasil Implementasi PPG ke KPK" },
            { href: "/laporan-survey-awareness-gcg", label: "Laporan Survey Awareness GCG" },
        ],
    },
    { href: "/kajian-internal", label: "Kajian Internal GCG", icon: "icon-search" },
    {
        label: "Approval Kepatuhan",
        icon: "icon-check",
        id: "approval-kepatuhan",
        vipOnly: true,
        children: [{ href: "/approval-pernyataan-kepatuhan", label: "Approval Pernyataan Kepatuhan" }],
    },
    {
        label: "Assessment & Sertifikasi",
        icon: "icon-bar-graph",
        id: "assessment",
        vipOnly: true,
        children: [
            { href: "/assessment-gcg", label: "Assessment GCG" },
            { href: "/assessment/sertifikasi-iso-37001", label: "Sertifikasi ISO 37001" },
        ],
    },
    { href: "/berita-gcg", label: "Berita GCG", icon: "icon-head" },
    // Admin-only menu
    {
        label: "Panel Admin",
        icon: "icon-settings",
        id: "admin",
        adminOnly: true,
        children: [
            { href: "/admin", label: "Manajemen Konten" },
            { href: "/admin/recycle", label: "Recycle" },
            { href: "/admin/users", label: "Manajemen Pengguna" },
        ],
    },
];

export default function Sidebar({ initialRole = "USER", initialUsername = "" }: { initialRole?: string, initialUsername?: string }) {
    const pathname = usePathname();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    
    const userRole = normalizeAppRole(initialRole);

    const isAdmin = userRole === "ADMIN";
    const isVip = userRole === "USER_VIP" || userRole === "ADMIN";

    const toggleMenu = (id: string) => {
        setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const wrappedSubmenuTextStyle: React.CSSProperties = {
        whiteSpace: "normal",
        wordBreak: "break-word",
        lineHeight: 1.35,
    };

    // Filter top-level items based on role
    const filteredNavItems = navItems.filter((item) => {
        if (item.adminOnly) return isAdmin;
        if (item.vipOnly) return isVip;
        return true;
    });

    // Role badge shown at bottom of sidebar
    const roleBadge = isAdmin
        ? { label: "Admin", bg: "#1a3a2a", color: "#fff" }
        : isVip
        ? { label: "VIP", bg: "#c8a951", color: "#fff" }
        : { label: "User Biasa", bg: "#e2e8f0", color: "#475569" };

    const renderChild = (child: NavChild | NavChildGroup, cidx: number) => {
        // Nested group child
        if ("children" in child && child.children) {
            const grp = child as NavChildGroup;
            const nestedOpen = openMenus[grp.id];
            return (
                <li key={cidx} className="nav-item">
                    <button
                        className="nav-link w-100 text-left border-0 bg-transparent"
                        style={{ textAlign: "left", whiteSpace: "normal", wordBreak: "break-word", lineHeight: 1.35, fontWeight: 600 }}
                        onClick={() => toggleMenu(grp.id)}
                        title={grp.label}
                    >
                        {grp.label}
                        <i className={`menu-arrow ${nestedOpen ? "rotate-down" : ""}`}></i>
                    </button>
                    {nestedOpen && (
                        <ul className="nav flex-column sub-menu" style={{ marginLeft: 12, borderLeft: "2px solid #e5e7eb", paddingLeft: 8 }}>
                            {grp.children.map((nestedChild, nidx) => (
                                <li key={nidx} className="nav-item">
                                    <Link
                                        className="nav-link"
                                        href={nestedChild.href}
                                        target={nestedChild.external ? "_blank" : undefined}
                                        rel={nestedChild.external ? "noopener noreferrer" : undefined}
                                        style={wrappedSubmenuTextStyle}
                                        title={nestedChild.label}
                                    >
                                        {nestedChild.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </li>
            );
        }

        // Simple link
        const lnk = child as NavChild;
        return (
            <li key={cidx} className={`nav-item ${pathname === lnk.href ? "active" : ""}`}>
                <Link
                    className="nav-link"
                    href={lnk.href}
                    target={lnk.external ? "_blank" : undefined}
                    rel={lnk.external ? "noopener noreferrer" : undefined}
                    style={wrappedSubmenuTextStyle}
                    title={lnk.label}
                >
                    {lnk.label}
                </Link>
            </li>
        );
    };

    return (
        <nav className="sidebar sidebar-offcanvas" id="sidebar">
            <ul className="nav">
                {filteredNavItems.map((item, idx) => {
                    // Simple link (no children)
                    if (!item.children) {
                        return (
                            <li key={idx} className={`nav-item ${pathname === item.href ? "active" : ""}`}>
                                <Link className="nav-link" href={item.href!}>
                                    <i className={`${item.icon} menu-icon`}></i>
                                    <span className="menu-title">{item.label}</span>
                                </Link>
                            </li>
                        );
                    }

                    const isOpen = openMenus[item.id!];
                    return (
                        <li key={idx} className="nav-item">
                            <button
                                className="nav-link w-100 text-left border-0 bg-transparent"
                                style={{ textAlign: "left" }}
                                onClick={() => toggleMenu(item.id!)}
                            >
                                <i className={`${item.icon} menu-icon`}></i>
                                <span className="menu-title">{item.label}</span>
                                {/* Admin badge */}
                                {item.adminOnly && (
                                    <span
                                        style={{
                                            fontSize: 9,
                                            fontWeight: 700,
                                            backgroundColor: "#1a3a2a",
                                            color: "#fff",
                                            padding: "1px 5px",
                                            borderRadius: 4,
                                            marginLeft: 4,
                                        }}
                                    >
                                        ADMIN
                                    </span>
                                )}
                                <i className={`menu-arrow ${isOpen ? "rotate-down" : ""}`}></i>
                            </button>
                            {isOpen && (
                                <ul className="nav flex-column sub-menu">
                                    {item.children.map((child, cidx) => renderChild(child, cidx))}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
