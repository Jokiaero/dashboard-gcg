import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ALLOWED_DOCUMENT_CATEGORIES, type AllowedDocumentCategory, upsertDocumentRecord } from "@/lib/documentStore";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { isAdminRole } from "@/lib/roles";

const allowedCategories = [...ALLOWED_DOCUMENT_CATEGORIES];

function isAllowedCategory(value: string): value is AllowedDocumentCategory {
    return allowedCategories.includes(value as AllowedDocumentCategory);
}

export async function POST(req: NextRequest) {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user || !isAdminRole(session.user.role)) {
        return NextResponse.json({ error: "Unauthorized. Admin only." }, { status: 403 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const category = (formData.get("category") as string) || "documents";
        const targetNameRaw = (formData.get("targetName") as string) || "";
        const regulasiSlug = (formData.get("regulasiSlug") as string) || "";

        if (!file) {
            return NextResponse.json({ error: "Tidak ada file yang diupload" }, { status: 400 });
        }

        // Validate file type (mime OR extension) to handle browsers that send empty/non-standard mime.
        const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
        const allowedExtensions = [".pdf", ".png", ".jpg", ".jpeg", ".xls", ".xlsx"];
        const fileExtension = path.extname(file.name).toLowerCase();
        const isAllowedByMime = allowedTypes.includes(file.type);
        const isAllowedByExtension = allowedExtensions.includes(fileExtension);

        if (!isAllowedByMime && !isAllowedByExtension) {
            return NextResponse.json({ error: "Tipe file tidak didukung. Gunakan PDF, PNG, JPG, atau Excel." }, { status: 400 });
        }

        // Max 20MB
        if (file.size > 20 * 1024 * 1024) {
            return NextResponse.json({ error: "Ukuran file maksimal 20MB" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Determine folder: regulasi, softstructure, assessment, kajian, documents, etc.
        const safeCategory = isAllowedCategory(category) ? category : "documents";

        // Regulasi should always be uploaded as PDF.
        if (safeCategory === "regulasi" && fileExtension !== ".pdf" && file.type !== "application/pdf") {
            return NextResponse.json({ error: "Dokumen regulasi harus berformat PDF." }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "assets", safeCategory);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Use optional target name or original filename. This allows adding new regulasi files.
        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const normalizedTarget = targetNameRaw.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
        const targetExt = path.extname(normalizedTarget).toLowerCase();

        if (safeCategory === "regulasi" && targetExt && targetExt !== ".pdf") {
            return NextResponse.json({ error: "Nama file regulasi harus berformat .pdf" }, { status: 400 });
        }

        const baseName = normalizedTarget
            ? (targetExt ? normalizedTarget : `${normalizedTarget}${fileExtension || ""}`)
            : safeOriginalName;

        const filePath = path.join(uploadDir, baseName);
        await writeFile(filePath, buffer);

        const publicUrl = `/assets/${safeCategory}/${baseName}`;

        await upsertDocumentRecord({
            category: safeCategory,
            name: baseName,
            originalName: file.name,
            url: publicUrl,
            size: file.size,
            mimeType: file.type,
            uploadedBy: session.user.username,
            regulasiSlug: regulasiSlug || undefined,
        });

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: baseName,
            category: safeCategory,
            size: file.size,
        });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Gagal mengupload file", details: error.message }, { status: 500 });
    }
}
