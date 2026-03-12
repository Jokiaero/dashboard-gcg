import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        if (!session.user || session.user.role !== "SUPERADMIN") {
            return NextResponse.json({ error: "Akses Ditolak. Hanya Superadmin yang dapat melihat Audit Trail." }, { status: 403 });
        }

        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json(logs);
    } catch {
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}
