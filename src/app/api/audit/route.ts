import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { isAdminRole } from "@/lib/roles";

export async function GET(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Akses Ditolak. Hanya Admin yang dapat melihat Audit Trail." }, { status: 403 });
    }

    const logs = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100
    });

    return NextResponse.json(logs);
}
