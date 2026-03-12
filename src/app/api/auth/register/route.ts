import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export async function POST(req: NextRequest) {
    try {
        const { username, password, role = "GUEST" } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
        }

        const existing = await prisma.user.findUnique({ where: { username } });
        if (existing) {
            return NextResponse.json({ error: "Username sudah digunakan" }, { status: 409 });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { username, password: hashed, role } as any,
        });

        // Auto login after register
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        const userData = user as any;
        session.user = { id: userData.id, username: userData.username, role: userData.role };
        await session.save();

        return NextResponse.json({ success: true, id: userData.id, role: userData.role }, { status: 201 });
    } catch (error: any) {
        console.error("Registration error:", error);
        return NextResponse.json({ error: "Terjadi kesalahan pada server", details: error.message }, { status: 500 });
    }
}
