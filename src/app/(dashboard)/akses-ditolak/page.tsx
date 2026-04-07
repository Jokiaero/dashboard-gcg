"use client";

import Link from "next/link";

export default function AksesDitolakPage() {
    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8fafc",
                fontFamily: "Inter, system-ui, sans-serif",
            }}
        >
            <div
                style={{
                    textAlign: "center",
                    padding: "48px 40px",
                    maxWidth: 480,
                    backgroundColor: "#fff",
                    borderRadius: 16,
                    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
                    border: "1px solid #f1f5f9",
                }}
            >
                {/* Icon */}
                <div
                    style={{
                        width: 80,
                        height: 80,
                        borderRadius: "50%",
                        backgroundColor: "#fee2e2",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 20px",
                        fontSize: 36,
                    }}
                >
                    🔒
                </div>

                {/* Title */}
                <h2
                    style={{
                        fontSize: "1.4rem",
                        fontWeight: 800,
                        color: "#1e293b",
                        marginBottom: 8,
                    }}
                >
                    Akses Tidak Diizinkan
                </h2>

                {/* Subtitle */}
                <p style={{ fontSize: 14, color: "#64748b", marginBottom: 8, lineHeight: 1.6 }}>
                    Halaman ini hanya dapat diakses oleh pengguna dengan hak akses{" "}
                    <strong style={{ color: "#c8a951" }}>VIP</strong> atau{" "}
                    <strong style={{ color: "#1a3a2a" }}>Admin</strong>.
                </p>
                <p style={{ fontSize: 13, color: "#94a3b8", marginBottom: 28, lineHeight: 1.6 }}>
                    Akun Anda saat ini memiliki akses <strong>User Biasa</strong>. Hubungi administrator untuk
                    peningkatan hak akses.
                </p>

                {/* Role info cards */}
                <div
                    style={{
                        display: "flex",
                        gap: 10,
                        marginBottom: 28,
                        justifyContent: "center",
                        flexWrap: "wrap",
                    }}
                >
                    {[
                        { label: "User Biasa", desc: "Dashboard & Regulasi", bg: "#f1f5f9", color: "#475569", active: true },
                        { label: "VIP", desc: "Semua Laporan & Kajian", bg: "#fef9e7", color: "#b45309", active: false },
                        { label: "Admin", desc: "Kontrol Penuh", bg: "#e8f3ee", color: "#1a3a2a", active: false },
                    ].map((r) => (
                        <div
                            key={r.label}
                            style={{
                                padding: "8px 14px",
                                borderRadius: 8,
                                backgroundColor: r.bg,
                                border: r.active ? "2px solid #94a3b8" : "1px solid transparent",
                                opacity: r.active ? 1 : 0.6,
                            }}
                        >
                            <div style={{ fontSize: 12, fontWeight: 700, color: r.color }}>{r.label}</div>
                            <div style={{ fontSize: 10, color: "#94a3b8" }}>{r.desc}</div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                    <Link
                        href="/"
                        style={{
                            padding: "10px 24px",
                            borderRadius: 8,
                            backgroundColor: "#2b4c3d",
                            color: "#fff",
                            fontWeight: 700,
                            fontSize: 13,
                            textDecoration: "none",
                        }}
                    >
                        ← Kembali ke Dashboard
                    </Link>
                    <Link
                        href="/regulasi"
                        style={{
                            padding: "10px 24px",
                            borderRadius: 8,
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            fontWeight: 600,
                            fontSize: 13,
                            textDecoration: "none",
                            border: "1px solid #e2e8f0",
                        }}
                    >
                        Lihat Regulasi
                    </Link>
                </div>
            </div>
        </div>
    );
}
