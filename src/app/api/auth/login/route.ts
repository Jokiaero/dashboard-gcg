import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sessionOptions, SessionData } from "@/lib/session";
import { normalizeAppRole } from "@/lib/roles";

export async function POST(req: NextRequest) {
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
            return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return NextResponse.json({ error: "Username atau password salah" }, { status: 401 });
        }

        const normalizedRole = normalizeAppRole(user.role);

        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        session.user = { id: user.id, username: user.username, role: normalizedRole };
        await session.save();

        // Set cookie role (plain, tidak encrypted) agar middleware bisa baca di edge runtime
        const response = NextResponse.json({ success: true, role: normalizedRole });
        response.cookies.set("gcg_role", normalizedRole, {
            httpOnly: false,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 8, // 8 jam
            path: "/",
        });
        return response;
    } catch (error: any) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Terjadi kesalahan pada server", details: error?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
