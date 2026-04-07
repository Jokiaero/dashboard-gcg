import { existsSync, readdirSync, statSync } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export const ALLOWED_DOCUMENT_CATEGORIES = [
    "regulasi",
    "softstructure",
    "assessment",
    "kajian",
    "penghargaan",
    "documents",
    "pelaporan_wbs",
    "pelaporan_risiko",
    "pelaporan_penyuapan",
    "pelaporan_ppg",
    "pelaporan_survey",
    "approval_kepatuhan",
] as const;

export type AllowedDocumentCategory = (typeof ALLOWED_DOCUMENT_CATEGORIES)[number];

type UploadRecordPayload = {
    category: string;
    name: string;
    originalName?: string;
    url: string;
    size: number;
    mimeType?: string;
    uploadedBy?: string;
    regulasiSlug?: string;
};

let initialized = false;

function isAllowedCategory(category: string): boolean {
    return ALLOWED_DOCUMENT_CATEGORIES.includes(category as AllowedDocumentCategory);
}

function inferFileType(name: string): string {
    const ext = path.extname(name).toLowerCase();
    if (ext === ".pdf") return "PDF";
    if ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext)) return "Gambar";
    return "Dokumen";
}

function inferMimeByExtension(name: string): string {
    const ext = path.extname(name).toLowerCase();
    if (ext === ".pdf") return "application/pdf";
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".xls") return "application/vnd.ms-excel";
    if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return "application/octet-stream";
}

function toNumberSize(size: bigint | number): number {
    if (typeof size === "bigint") return Number(size);
    return Number(size || 0);
}

export async function ensureDocumentStoreTable() {
    if (initialized) return;

    try {
        await prisma.uploadedDocument.findFirst({ select: { id: true } });
        await prisma.uploadedDocumentRecycle.findFirst({ select: { id: true } });
    } catch {
        throw new Error("Tabel dokumen belum tersedia. Jalankan: npx prisma db push");
    }

    initialized = true;
}

export async function upsertDocumentRecord(payload: UploadRecordPayload) {
    await ensureDocumentStoreTable();

    await prisma.uploadedDocument.upsert({
        where: {
            category_name: {
                category: payload.category,
                name: payload.name,
            },
        },
        update: {
            originalName: payload.originalName ?? null,
            url: payload.url,
            size: BigInt(payload.size),
            mimeType: payload.mimeType ?? null,
            uploadedBy: payload.uploadedBy ?? null,
            regulasiSlug: payload.regulasiSlug ?? null,
            isDeleted: false,
            deletedAt: null,
        },
        create: {
            category: payload.category,
            name: payload.name,
            originalName: payload.originalName ?? null,
            url: payload.url,
            size: BigInt(payload.size),
            mimeType: payload.mimeType ?? null,
            uploadedBy: payload.uploadedBy ?? null,
            regulasiSlug: payload.regulasiSlug ?? null,
            isDeleted: false,
            deletedAt: null,
        },
    });
}

export async function markDocumentDeleted(category: string, name: string): Promise<number> {
    await ensureDocumentStoreTable();

    const active = await prisma.uploadedDocument.findUnique({
        where: { category_name: { category, name } },
    });

    if (!active) {
        return 0;
    }

    await prisma.$transaction(async (tx) => {
        await tx.uploadedDocumentRecycle.upsert({
            where: { category_name: { category, name } },
            update: {
                originalName: active.originalName,
                url: active.url,
                size: active.size,
                mimeType: active.mimeType,
                uploadedBy: active.uploadedBy,
                regulasiSlug: active.regulasiSlug,
                deletedAt: new Date(),
            },
            create: {
                category: active.category,
                name: active.name,
                originalName: active.originalName,
                url: active.url,
                size: active.size,
                mimeType: active.mimeType,
                uploadedBy: active.uploadedBy,
                regulasiSlug: active.regulasiSlug,
                deletedAt: new Date(),
            },
        });

        await tx.uploadedDocument.delete({
            where: { category_name: { category, name } },
        });
    });

    return 1;
}

export async function restoreDocument(category: string, name: string): Promise<number> {
    await ensureDocumentStoreTable();

    const recycled = await prisma.uploadedDocumentRecycle.findUnique({
        where: { category_name: { category, name } },
    });

    if (!recycled) {
        return 0;
    }

    await prisma.$transaction(async (tx) => {
        await tx.uploadedDocument.upsert({
            where: { category_name: { category, name } },
            update: {
                originalName: recycled.originalName,
                url: recycled.url,
                size: recycled.size,
                mimeType: recycled.mimeType,
                uploadedBy: recycled.uploadedBy,
                regulasiSlug: recycled.regulasiSlug,
                isDeleted: false,
                deletedAt: null,
            },
            create: {
                category: recycled.category,
                name: recycled.name,
                originalName: recycled.originalName,
                url: recycled.url,
                size: recycled.size,
                mimeType: recycled.mimeType,
                uploadedBy: recycled.uploadedBy,
                regulasiSlug: recycled.regulasiSlug,
                isDeleted: false,
                deletedAt: null,
            },
        });

        await tx.uploadedDocumentRecycle.delete({
            where: { category_name: { category, name } },
        });
    });

    return 1;
}

export async function deleteDocumentPermanently(category: string, name: string): Promise<number> {
    await ensureDocumentStoreTable();

    const [deletedActive, deletedRecycle] = await prisma.$transaction([
        prisma.uploadedDocument.deleteMany({ where: { category, name } }),
        prisma.uploadedDocumentRecycle.deleteMany({ where: { category, name } }),
    ]);

    return deletedActive.count + deletedRecycle.count;
}

export async function listDocumentsByCategory(category: string) {
    await ensureDocumentStoreTable();

    const rows = await prisma.uploadedDocument.findMany({
        where: {
            category,
            isDeleted: false,
        },
        orderBy: [
            { updatedAt: "desc" },
            { id: "desc" },
        ],
    });

    return rows.map((row) => ({
        name: row.name,
        url: row.url,
        size: toNumberSize(row.size),
        type: inferFileType(row.name),
        category: row.category,
        modifiedAt: row.updatedAt.toISOString(),
    }));
}

export async function listDeletedDocumentsByCategory(category: string) {
    await ensureDocumentStoreTable();

    const rows = await prisma.uploadedDocumentRecycle.findMany({
        where: { category },
        orderBy: [
            { updatedAt: "desc" },
            { id: "desc" },
        ],
    });

    return rows.map((row) => ({
        name: row.name,
        url: row.url,
        size: toNumberSize(row.size),
        type: inferFileType(row.name),
        category: row.category,
        modifiedAt: row.updatedAt.toISOString(),
    }));
}

export async function listDeletedDocumentsAllCategories() {
    await ensureDocumentStoreTable();

    const rows = await prisma.uploadedDocumentRecycle.findMany({
        orderBy: [
            { updatedAt: "desc" },
            { id: "desc" },
        ],
    });

    return rows.map((row) => ({
        name: row.name,
        url: row.url,
        size: toNumberSize(row.size),
        type: inferFileType(row.name),
        category: row.category,
        modifiedAt: row.updatedAt.toISOString(),
    }));
}

export async function syncCategoryFromFilesystem(category: string) {
    await ensureDocumentStoreTable();

    if (!isAllowedCategory(category)) return;

    const dirPath = path.join(process.cwd(), "public", "assets", category);
    const diskNames: string[] = [];

    const recycledRows = await prisma.uploadedDocumentRecycle.findMany({
        where: { category },
        select: { name: true },
    });
    const recycledNameSet = new Set(recycledRows.map((row) => row.name));

    if (existsSync(dirPath)) {
        const entries = readdirSync(dirPath).filter((f) => !f.startsWith("."));

        for (const fileName of entries) {
            const filePath = path.join(dirPath, fileName);
            const stat = statSync(filePath);
            if (!stat.isFile()) continue;

            diskNames.push(fileName);

            // Keep user-deleted entries in recycle bin until restored explicitly.
            if (recycledNameSet.has(fileName)) {
                continue;
            }

            await upsertDocumentRecord({
                category,
                name: fileName,
                originalName: fileName,
                url: `/assets/${category}/${fileName}`,
                size: stat.size,
                mimeType: inferMimeByExtension(fileName),
            });
        }
    }

    const activeRows = await prisma.uploadedDocument.findMany({
        where: {
            category,
            isDeleted: false,
        },
        select: { name: true },
    });

    const diskSet = new Set(diskNames);
    for (const row of activeRows) {
        if (!diskSet.has(row.name)) {
            await markDocumentDeleted(category, row.name);
        }
    }
}
