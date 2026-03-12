import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { logAudit } from "@/lib/auditLogger";

export async function POST(req: NextRequest) {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        if (!session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: "Password saat ini dan password baru wajib diisi" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) {
            return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
        }

        const valid = await bcrypt.compare(currentPassword, user.password);
        if (!valid) {
            return NextResponse.json({ error: "Password saat ini salah" }, { status: 401 });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: session.user.id },
            data: { password: hashed },
        });

        await logAudit(
            "UPDATE_PASSWORD",
            session.user.username,
            "Pengguna memperbarui kata sandi akunnya."
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Settings update error:", error);
        return NextResponse.json({ error: "Terjadi kesalahan pada server", details: error.message }, { status: 500 });
    }
}
