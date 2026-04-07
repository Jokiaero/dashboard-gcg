import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { logAudit } from "@/lib/auditLogger";
import { isBasicUserRole } from "@/lib/roles";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const skip = (page - 1) * limit;

    const where = search
        ? {
            OR: [
                { nama: { contains: search } },
                { nik: { contains: search } },
                { jabatan: { contains: search } },
                { department: { contains: search } },
            ],
        }
        : {};

    const [data, total] = await Promise.all([
        prisma.dataLaporan.findMany({ where, skip, take: limit, orderBy: { id: "desc" } }),
        prisma.dataLaporan.count({ where }),
    ]);

    return NextResponse.json({ data, total, page, limit });
}

export async function POST(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isBasicUserRole(session.user.role)) {
        return NextResponse.json({ error: "Terlarang. Anda tidak memiliki akses untuk menambah data." }, { status: 403 });
    }

    const body = await req.json();
    const record = await prisma.dataLaporan.create({ data: body });

    await logAudit(
        "CREATE_LAPORAN", 
        session.user.username, 
        `Menambahkan dokumen Laporan dengan ID: ${record.id}`
    );

    return NextResponse.json(record, { status: 201 });
}
