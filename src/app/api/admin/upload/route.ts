import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, SessionData } from "@/lib/session";
import { ALLOWED_DOCUMENT_CATEGORIES, type AllowedDocumentCategory, upsertDocumentRecord } from "@/lib/documentStore";
import { generateDocumentThumbnail } from "@/lib/documentThumbnail";
import { inferPelaporanCategoryFromName, isPelaporanCategory } from "@/lib/pelaporanClassifier";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { isAdminRole } from "@/lib/roles";

const allowedCategories = [...ALLOWED_DOCUMENT_CATEGORIES];

function isAllowedCategory(value: string): value is AllowedDocumentCategory {
    return allowedCategories.includes(value as AllowedDocumentCategory);
}

function buildTargetFileName(fileExtension: string, safeOriginalName: string, normalizedTarget: string): string {
    const targetExt = path.extname(normalizedTarget).toLowerCase();
    if (!normalizedTarget) {
        return safeOriginalName;
    }
    return targetExt ? normalizedTarget : `${normalizedTarget}${fileExtension || ""}`;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Terjadi kesalahan yang tidak diketahui";
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
        const requestedCategory = isAllowedCategory(category) ? category : "documents";

        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const normalizedTarget = targetNameRaw.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
        const targetExt = path.extname(normalizedTarget).toLowerCase();
        const baseName = buildTargetFileName(fileExtension, safeOriginalName, normalizedTarget);

        const requestedUploadDir = path.join(process.cwd(), "public", "assets", requestedCategory);
        const isUpdateMode = Boolean(normalizedTarget) && existsSync(path.join(requestedUploadDir, baseName));

        let safeCategory = requestedCategory;
        if (isPelaporanCategory(requestedCategory) && !isUpdateMode) {
            const inferredCategory = inferPelaporanCategoryFromName(file.name, baseName);
            if (inferredCategory) {
                safeCategory = inferredCategory;
            }
        }

        const categoryAdjusted = safeCategory !== requestedCategory;

        // Regulasi should always be uploaded as PDF.
        if (safeCategory === "regulasi" && fileExtension !== ".pdf" && file.type !== "application/pdf") {
            return NextResponse.json({ error: "Dokumen regulasi harus berformat PDF." }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "assets", safeCategory);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        if (safeCategory === "regulasi" && targetExt && targetExt !== ".pdf") {
            return NextResponse.json({ error: "Nama file regulasi harus berformat .pdf" }, { status: 400 });
        }

        const filePath = path.join(uploadDir, baseName);
        await writeFile(filePath, buffer);

        const publicUrl = `/assets/${safeCategory}/${baseName}`;
        const thumbnailUrl = await generateDocumentThumbnail({
            category: safeCategory,
            fileName: baseName,
            filePath,
            publicUrl,
        });

        await upsertDocumentRecord({
            category: safeCategory,
            name: baseName,
            originalName: file.name,
            url: publicUrl,
            thumbnailUrl,
            size: file.size,
            mimeType: file.type,
            uploadedBy: session.user.username,
            regulasiSlug: regulasiSlug || undefined,
        });

        return NextResponse.json({
            success: true,
            url: publicUrl,
            thumbnailUrl,
            name: baseName,
            category: safeCategory,
            requestedCategory,
            categoryAdjusted,
            isUpdateMode,
            size: file.size,
        });
    } catch (error: unknown) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Gagal mengupload file", details: getErrorMessage(error) }, { status: 500 });
    }
}
