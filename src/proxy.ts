import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/api/auth/login", "/api/auth/register"];

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Avoid using iron-session in middleware runtime; check session cookie presence only.
    const sessionCookie = req.cookies.get("gcg_session")?.value;
    if (!sessionCookie) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|assets/).*)"],
};
