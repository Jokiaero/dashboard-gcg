import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { logAudit } from "@/lib/auditLogger";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || session.user.role === "AUDITOR" || session.user.role === "GUEST") {
        return NextResponse.json({ error: "Terlarang. Anda tidak memiliki akses untuk mengubah data." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const record = await prisma.dataLaporan.update({
        where: { id: parseInt(id) },
        data: body,
    });

    await logAudit(
        "UPDATE_LAPORAN", 
        session.user.username, 
        `Mengubah dokumen Laporan dengan ID: ${record.id}`
    );

    return NextResponse.json(record);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || session.user.role === "AUDITOR" || session.user.role === "GUEST") {
        return NextResponse.json({ error: "Terlarang. Anda tidak memiliki akses untuk menghapus data." }, { status: 403 });
    }

    const { id } = await params;
    await prisma.dataLaporan.delete({ where: { id: parseInt(id) } });

    await logAudit(
        "DELETE_LAPORAN", 
        session.user.username, 
        `Menghapus dokumen Laporan dengan ID: ${id}`
    );

    return NextResponse.json({ success: true });
}
