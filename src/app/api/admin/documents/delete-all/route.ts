import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { unlinkSync, existsSync, readdirSync } from "fs";
import path from "path";
import {
    ALLOWED_DOCUMENT_CATEGORIES,
    type AllowedDocumentCategory,
    deleteDocumentPermanently,
    listDeletedDocumentsByCategory,
    listDeletedDocumentsAllCategories,
} from "@/lib/documentStore";
import { removeDocumentThumbnail } from "@/lib/documentThumbnail";
import { isAdminRole } from "@/lib/roles";

const allowedCategories = [...ALLOWED_DOCUMENT_CATEGORIES];

function isAllowedCategory(value: string): value is AllowedDocumentCategory {
    return allowedCategories.includes(value as AllowedDocumentCategory);
}

// POST: delete all files in recycle for a category
export async function POST(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { category } = await req.json();
    const safeCategory = category === "all" ? "all" : (isAllowedCategory(category) ? category : "documents");

    try {
        const deletedFiles = safeCategory === "all"
            ? await listDeletedDocumentsAllCategories()
            : await listDeletedDocumentsByCategory(safeCategory as AllowedDocumentCategory);

        if (deletedFiles.length === 0) {
            return NextResponse.json({ success: true, deleted: 0, message: "Tidak ada file untuk dihapus" });
        }

        let deletedCount = 0;

        // If deleting all categories, process each category
        if (safeCategory === "all") {
            const categoriesInRecycle = new Set(deletedFiles.map(f => f.category));

            for (const cat of categoriesInRecycle) {
                const filesInCategory = deletedFiles.filter(f => f.category === cat);

                for (const file of filesInCategory) {
                    try {
                        const filePath = path.join(process.cwd(), "public", "assets", cat, file.name);
                        if (existsSync(filePath)) {
                            unlinkSync(filePath);
                        }
                        await removeDocumentThumbnail(cat, file.name);
                        await deleteDocumentPermanently(cat as AllowedDocumentCategory, file.name);
                        deletedCount++;
                    } catch (err) {
                        console.error(`Failed to delete ${cat}/${file.name}:`, err);
                    }
                }
            }
        } else {
            // Delete all files in a specific category
            for (const file of deletedFiles) {
                try {
                    const filePath = path.join(process.cwd(), "public", "assets", safeCategory, file.name);
                    if (existsSync(filePath)) {
                        unlinkSync(filePath);
                    }
                    await removeDocumentThumbnail(safeCategory as AllowedDocumentCategory, file.name);
                    await deleteDocumentPermanently(safeCategory as AllowedDocumentCategory, file.name);
                    deletedCount++;
                } catch (err) {
                    console.error(`Failed to delete ${safeCategory}/${file.name}:`, err);
                }
            }
        }

        return NextResponse.json({
            success: true,
            deleted: deletedCount,
            message: `${deletedCount} file${deletedCount !== 1 ? 's' : ''} berhasil dihapus permanen`,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
