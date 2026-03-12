import { NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sessionOptions, SessionData } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        if (!session.user || session.user.role !== "SUPERADMIN") {
            return NextResponse.json(
                { error: "Akses Ditolak. Hanya Superadmin yang dapat melihat Audit Trail." },
                { status: 403 }
            );
        }

        const data = await prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: "Gagal ambil data" }, { status: 500 });
    }
}