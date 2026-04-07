import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { unlinkSync, existsSync } from "fs";
import path from "path";
import {
    ALLOWED_DOCUMENT_CATEGORIES,
    type AllowedDocumentCategory,
    deleteDocumentPermanently,
    listDeletedDocumentsAllCategories,
    listDeletedDocumentsByCategory,
    listDocumentsByCategory,
    markDocumentDeleted,
    restoreDocument,
    syncCategoryFromFilesystem,
} from "@/lib/documentStore";
import { isAdminRole } from "@/lib/roles";

const allowedCategories = [...ALLOWED_DOCUMENT_CATEGORIES];

function isAllowedCategory(value: string): value is AllowedDocumentCategory {
    return allowedCategories.includes(value as AllowedDocumentCategory);
}

// GET: list all files in a category
export async function GET(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    // GET boleh diakses oleh semua user yang sudah login (karena VIP/User butuh melihat daftar dokumen laporan)
    if (!session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "documents";
    const includeDeleted = ["1", "true", "yes"].includes((searchParams.get("deleted") || "").toLowerCase());
    const isAllDeletedRequest = includeDeleted && category === "all";
    const safeCategory = isAllowedCategory(category) ? category : "documents";

    if (includeDeleted && !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        if (isAllDeletedRequest) {
            const files = await listDeletedDocumentsAllCategories();
            return NextResponse.json({ files, deleted: true, category: "all" });
        }

        // Keep DB metadata consistent with physical files.
        await syncCategoryFromFilesystem(safeCategory);

        const files = includeDeleted
            ? await listDeletedDocumentsByCategory(safeCategory)
            : await listDocumentsByCategory(safeCategory);

        return NextResponse.json({ files, deleted: includeDeleted });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PATCH: recycle actions (restore/permanent delete)
export async function PATCH(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { category, name, action } = await req.json();
    const safeCategory = isAllowedCategory(category) ? category : "documents";

    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
        return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "assets", safeCategory, name);

    try {
        if (action === "restore") {
            if (!existsSync(filePath)) {
                return NextResponse.json({ error: "File fisik tidak ditemukan, tidak bisa dipulihkan" }, { status: 404 });
            }

            const affected = await restoreDocument(safeCategory, name);
            if (affected === 0) {
                return NextResponse.json({ error: "Data recycle tidak ditemukan" }, { status: 404 });
            }

            return NextResponse.json({ success: true, action: "restore" });
        }

        if (action === "permanent-delete") {
            const hasPhysicalFile = existsSync(filePath);
            if (hasPhysicalFile) {
                unlinkSync(filePath);
            }

            const affected = await deleteDocumentPermanently(safeCategory, name);
            if (!hasPhysicalFile && affected === 0) {
                return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
            }

            return NextResponse.json({ success: true, action: "permanent-delete" });
        }

        return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// DELETE: remove a file
export async function DELETE(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { category, name } = await req.json();
    const safeCategory = isAllowedCategory(category) ? category : "documents";

    // Prevent path traversal
    if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
        return NextResponse.json({ error: "Nama file tidak valid" }, { status: 400 });
    }

    try {
        // Soft delete: move metadata to recycle bin and keep physical file for potential restore.
        const affected = await markDocumentDeleted(safeCategory, name);
        if (affected === 0) {
            return NextResponse.json({ error: "File tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
