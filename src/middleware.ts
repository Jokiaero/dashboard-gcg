import { NextRequest, NextResponse } from "next/server";
import { normalizeAppRole } from "@/lib/roles";

// Routes yang hanya bisa diakses VIP (USER_VIP) dan Admin (ADMIN)
// Catatan: modul non-pelaporan dapat diakses USER biasa.
const VIP_ROUTES = [
    "/laporan-wbs",
    "/laporan-risiko-keuangan",
    "/laporan-monitoring-risiko-penyuapan",
    "/laporan-implementasi-ppg-kpk",
    "/laporan-survey-awareness-gcg",
    "/approval-pernyataan-kepatuhan",
    "/assessment",
    "/assessment-gcg",
    "/sertifikasi-iso",
];

// Routes yang hanya bisa diakses Admin (ADMIN)
const ADMIN_ROUTES = [
    "/admin",
    "/audit-log",
];

// Routes publik (tidak perlu cek apapun)
const PUBLIC_ROUTES = [
    "/login",
    "/register",
    "/akses-ditolak",
];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Bypass: static, API, assets, file extensions
    if (
        pathname.startsWith("/_next") ||
        pathname.startsWith("/api") ||
        pathname.startsWith("/assets") ||
        pathname.includes(".")
    ) {
        return NextResponse.next();
    }

    // Public routes tidak perlu cek
    if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
        return NextResponse.next();
    }

    // Baca cookie session (iron-session menyimpan cookie bernama "gcg_session")
    const hasSession = req.cookies.has("gcg_session");

    // Belum login → redirect ke login
    if (!hasSession) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Baca cookie role (di-set saat login, bukan encrypted)
    const role = normalizeAppRole(req.cookies.get("gcg_role")?.value);

    // Admin-only routes
    if (ADMIN_ROUTES.some((r) => pathname.startsWith(r)) && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/akses-ditolak", req.url));
    }

    // VIP-only routes
    if (VIP_ROUTES.some((r) => pathname.startsWith(r)) && role === "USER") {
        return NextResponse.redirect(new URL("/akses-ditolak", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|assets).*)"],
};
