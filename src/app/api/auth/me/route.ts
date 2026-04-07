import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { normalizeAppRole } from "@/lib/roles";

const DEFAULT_PROFILE_IMAGE = "/assets/images/faces/face28.png";

function safeProfileImagePath(value: string | null | undefined): string {
    const raw = String(value || "").trim();
    if (!raw.startsWith("/assets/images/faces/")) {
        return DEFAULT_PROFILE_IMAGE;
    }
    return raw;
}

export async function GET(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
        return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    }

    const sessionRole = normalizeAppRole(session.user.role);

    const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            username: true,
            role: true,
            profileImage: true,
        },
    });

    const dbRole = dbUser ? normalizeAppRole(dbUser.role) : sessionRole;
    const effectiveRole = dbRole;

    // Auto-patch session if role/username changed.
    if (
        session.user.role !== effectiveRole ||
        (dbUser && dbUser.username !== session.user.username)
    ) {
        session.user.role = effectiveRole;
        if (dbUser?.username) {
            session.user.username = dbUser.username;
        }
        await session.save();
    }

    const response = NextResponse.json({
        id: session.user.id,
        username: dbUser?.username || session.user.username,
        role: effectiveRole,
        profileImage: safeProfileImagePath(dbUser?.profileImage),
    });

    // Keep middleware role cookie in sync with normalized role.
    response.cookies.set("gcg_role", effectiveRole, {
        httpOnly: false,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 8,
        path: "/",
    });

    return response;
}
