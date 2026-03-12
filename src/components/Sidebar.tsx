"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
    { href: "/", label: "Dashboard", icon: "icon-grid" },
    {
        label: "Regulasi",
        icon: "icon-book",
        id: "regulasi",
        children: [
            { href: "https://peraturan.bpk.go.id/Details/264291/permen-bumn-no-per-2mbu032023-tahun-2023", label: "Peraturan Menteri", external: true },
            {
                label: "Peraturan Lainnya",
                id: "regulasi-lainnya",
                children: [
                    { href: "/assets/regulasi/per-1-mbu-03-2023-tjsl-bumn.pdf", label: "Penugasan Khusus dan Program Tanggung Jawab Sosial dan Lingkungan Badan Usaha Milik Negara", external: true },
                    { href: "/assets/regulasi/per-2-mbu-03-2023-tata-kelola-bumn.pdf", label: "Pedoman Tata Kelola dan Kegiatan Korporasi Signifikan Badan Usaha Milik Negara", external: true },
                    { href: "/assets/regulasi/per-3-mbu-03-2023-organ-sdm-bumn.pdf", label: "Organ dan Sumber Daya Manusia Badan Usaha Milik Negara", external: true },
                ],
            },
        ],
    },
    {
        label: "Softstructure GCG",
        icon: "icon-layout",
        id: "softstructure",
        children: [
            { href: "/assets/softstructure/pedoman-gcg-27-mei-2024-signed.pdf", label: "Pedoman GCG", external: true },
            { href: "/assets/softstructure/pedoman-etika-perilaku-coc-2024-signed.pdf", label: "Pedoman Perilaku", external: true },
            { href: "/assets/softstructure/pedoman-pengelolaan-informasi-2019-signed.pdf", label: "Pedoman Pengelolaan Informasi", external: true },
            { href: "/assets/softstructure/pedoman-benturan-kepentingan-2022-signed.pdf", label: "Pedoman Benturan Kepentingan", external: true },
            { href: "/assets/softstructure/pedoman-pengendalian-gratifikasi-2025-signed.pdf", label: "Pedoman Pengendalian Gratifikasi", external: true },
        ],
    },
    {
        label: "Pelaporan",
        icon: "icon-paper",
        id: "pelaporan",
        children: [
            { href: "/laporan-wbs", label: "Laporan WBS" },
            { href: "/laporan-risiko-keuangan", label: "Laporan Profil Risiko Anti Penyuapan" },
            { href: "/laporan-monitoring-risiko-penyuapan", label: "Laporan Monitoring Risiko Penyuapan" },
            { href: "/laporan-implementasi-ppg-kpk", label: "Laporan Hasil Implementasi PPG ke KPK" },
            { href: "/laporan-survey-awareness-gcg", label: "Laporan Survey Awareness GCG" },
        ],
    },
    {
        label: "Kajian",
        icon: "icon-search",
        id: "kajian",
        children: [{ href: "/kajian-internal", label: "Kajian Internal GCG" }],
    },
    {
        label: "Assessment & Sertifikasi",
        icon: "icon-bar-graph",
        id: "assessment",
        children: [
            { href: "/assessment-gcg", label: "Assessment GCG" },
            { href: "/assets/assessment/IABMS-738282.pdf", label: "Sertifikasi ISO 37001", external: true },
        ],
    },
    {
        label: "Penghargaan",
        icon: "icon-head",
        id: "penghargaan",
        children: [{ href: "/penghargaan", label: "Daftar Penghargaan" }],
    },
    { href: "/audit-log", label: "Audit Trail", icon: "icon-clock" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    const [userRole, setUserRole] = useState<string>("GUEST");

    // Fetch role once on mount
    useEffect(() => {
        const fetchRole = async () => {
            try {
                const res = await fetch("/api/auth/me");
                if (res.ok) {
                    const data = await res.json();
                    setUserRole(data.role || "GUEST");
                }
            } catch (err) {
                console.error("Failed to fetch role", err);
            }
        };
        fetchRole();
    }, []);

    const toggleMenu = (id: string) => {
        setOpenMenus((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const wrappedSubmenuTextStyle: React.CSSProperties = {
        whiteSpace: "normal",
        wordBreak: "break-word",
        lineHeight: 1.35,
    };

    const filteredNavItems = navItems.filter((item) => {
        // Hanya SUPERADMIN yang bisa melihat Audit Trail
        if (item.label === "Audit Trail") {
            return userRole === "SUPERADMIN"; 
        }

        // Selain Audit Trail, semua menu lain bisa dilihat oleh semua role (termasuk GUEST)
        return true; 
    });

    return (
        <nav className="sidebar sidebar-offcanvas" id="sidebar">
            <ul className="nav">
                {filteredNavItems.map((item, idx) => {
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
                                <i className={`menu-arrow ${isOpen ? "rotate-down" : ""}`}></i>
                            </button>
                            {isOpen && (
                                <ul className="nav flex-column sub-menu">
                                    {item.children.map((child, cidx) => {
                                        if ("children" in child && child.children) {
                                            const nestedOpen = openMenus[child.id!];
                                            return (
                                                <li key={cidx} className="nav-item">
                                                    <button
                                                        className="nav-link w-100 text-left border-0 bg-transparent"
                                                        style={{
                                                            textAlign: "left",
                                                            ...wrappedSubmenuTextStyle,
                                                            fontWeight: 600,
                                                        }}
                                                        onClick={() => toggleMenu(child.id!)}
                                                        title={child.label}
                                                    >
                                                        {child.label}
                                                        <i className={`menu-arrow ${nestedOpen ? "rotate-down" : ""}`}></i>
                                                    </button>
                                                    {nestedOpen && (
                                                        <ul
                                                            className="nav flex-column sub-menu"
                                                            style={{
                                                                marginLeft: 12,
                                                                borderLeft: "2px solid #e5e7eb",
                                                                paddingLeft: 8,
                                                            }}
                                                        >
                                                            {child.children.map((nestedChild, nidx) => (
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

                                        return (
                                            <li key={cidx} className="nav-item">
                                                <Link
                                                    className="nav-link"
                                                    href={child.href}
                                                    target={'external' in child && child.external ? "_blank" : undefined}
                                                    rel={'external' in child && child.external ? "noopener noreferrer" : undefined}
                                                    style={wrappedSubmenuTextStyle}
                                                    title={child.label}
                                                >
                                                    {child.label}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
