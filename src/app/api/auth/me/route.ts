import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
        return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    // Auto-patch old sessions missing the role field
    if (!session.user.role) {
        const dbUser = await prisma.user.findUnique({ where: { id: session.user.id } }) as any;
        if (dbUser && dbUser.role) {
            session.user.role = dbUser.role;
            await session.save();
        }
    }

    return NextResponse.json(session.user);
}
