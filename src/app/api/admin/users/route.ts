import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isAdminRole, normalizeAppRole } from "@/lib/roles";

// GET: list all users
export async function GET(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        select: { id: true, username: true, role: true, createdAt: true },
        orderBy: { createdAt: "desc" },
    }) as any[];

    return NextResponse.json({ users });
}

// POST: create user
export async function POST(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { username, password, role = "USER" } = await req.json();
    const normalizedRole = normalizeAppRole(role);

    const allowedRoles = ["ADMIN", "USER_VIP", "USER"];
    if (!allowedRoles.includes(normalizedRole)) {
        return NextResponse.json({ error: "Role tidak valid" }, { status: 400 });
    }

    if (!username || !password) {
        return NextResponse.json({ error: "Username dan password wajib diisi" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { username } }) as any;
    if (existing) {
        return NextResponse.json({ error: "Username sudah dipakai" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { username, password: hashed, role: normalizedRole } as any,
        select: { id: true, username: true, role: true },
    }) as any;

    return NextResponse.json({ success: true, user });
}

// PATCH: update user role or password
export async function PATCH(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id, role, password } = await req.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    const updateData: any = {};

    if (role) {
        updateData.role = normalizeAppRole(role);
    }
    if (password) updateData.password = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
        where: { id: Number(id) },
        data: updateData,
        select: { id: true, username: true, role: true },
    }) as any;

    return NextResponse.json({ success: true, user });
}

// DELETE: delete user
export async function DELETE(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID diperlukan" }, { status: 400 });

    // Prevent self-delete
    if (Number(id) === session.user.id) {
        return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
}
