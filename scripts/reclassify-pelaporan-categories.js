const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PELAPORAN_CATEGORIES = [
    "pelaporan_wbs",
    "pelaporan_risiko",
    "pelaporan_penyuapan",
    "pelaporan_ppg",
    "pelaporan_survey",
];

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const PDF_EXTENSION = ".pdf";

const MONITORING_KEYWORDS = [
    "monitoring",
    "risk register",
    "risk-register",
    "register risiko",
    "pemantauan risiko",
];

const PPG_KEYWORDS = [
    "ppg",
    "gratifikasi",
    "implementasi ppg",
    "kpk",
];

const SURVEY_KEYWORDS = [
    "survey",
    "awareness",
];

const RISIKO_KEYWORDS = [
    "profil risiko",
    "risk profile",
    "risk-profile",
    "template profil risiko",
    "risiko",
];

const WBS_KEYWORDS = [
    "wbs",
    "whistleblowing",
    "whistle blowing",
    "pelaporan pelanggaran",
    "pengaduan",
];

function normalizeMarker(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function hasAnyKeyword(marker, keywords) {
    return keywords.some((keyword) => marker.includes(keyword));
}

function inferPelaporanCategoryFromName(name, originalName) {
    const marker = normalizeMarker(`${name || ""} ${originalName || ""}`);
    if (!marker) {
        return null;
    }

    if (hasAnyKeyword(marker, MONITORING_KEYWORDS)) {
        return "pelaporan_penyuapan";
    }

    if (hasAnyKeyword(marker, PPG_KEYWORDS)) {
        return "pelaporan_ppg";
    }

    if (hasAnyKeyword(marker, SURVEY_KEYWORDS)) {
        return "pelaporan_survey";
    }

    if (hasAnyKeyword(marker, RISIKO_KEYWORDS)) {
        return "pelaporan_risiko";
    }

    if (hasAnyKeyword(marker, WBS_KEYWORDS)) {
        return "pelaporan_wbs";
    }

    return null;
}

function isImageFileName(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
}

function isPdfFileName(fileName) {
    return path.extname(fileName).toLowerCase() === PDF_EXTENSION;
}

function getAssetPath(category, fileName) {
    return path.join(process.cwd(), "public", "assets", category, fileName);
}

function toThumbnailFileName(fileName) {
    return `${path.parse(fileName).name}.png`;
}

function getThumbnailPath(category, fileName) {
    return path.join(process.cwd(), "public", "assets", "_thumbnails", category, toThumbnailFileName(fileName));
}

function getPublicUrl(category, fileName) {
    return `/assets/${category}/${fileName}`;
}

function getThumbnailUrl(category, fileName) {
    return `/assets/_thumbnails/${category}/${toThumbnailFileName(fileName)}`;
}

async function moveFile(sourcePath, targetPath) {
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await fsp.rename(sourcePath, targetPath);
}

async function moveThumbnail(oldCategory, newCategory, fileName) {
    if (!isPdfFileName(fileName)) {
        return;
    }

    const source = getThumbnailPath(oldCategory, fileName);
    const target = getThumbnailPath(newCategory, fileName);

    if (!fs.existsSync(source)) {
        return;
    }

    if (fs.existsSync(target)) {
        return;
    }

    await moveFile(source, target);
}

function resolveThumbnailAfterMove(category, fileName) {
    if (isImageFileName(fileName)) {
        return getPublicUrl(category, fileName);
    }

    if (!isPdfFileName(fileName)) {
        return null;
    }

    const thumbnailPath = getThumbnailPath(category, fileName);
    if (!fs.existsSync(thumbnailPath)) {
        return null;
    }

    return getThumbnailUrl(category, fileName);
}

function getArgFlag(flag) {
    return process.argv.includes(flag);
}

async function reclassifyRows({ model, modelLabel, rows, apply }) {
    let movedCount = 0;
    let updatedCount = 0;
    let conflictCount = 0;
    let skippedCount = 0;

    for (const row of rows) {
        const inferredCategory = inferPelaporanCategoryFromName(row.name, row.originalName || "");
        if (!inferredCategory || inferredCategory === row.category) {
            skippedCount += 1;
            continue;
        }

        const sourcePath = getAssetPath(row.category, row.name);
        const targetPath = getAssetPath(inferredCategory, row.name);
        const sourceExists = fs.existsSync(sourcePath);
        const targetExists = fs.existsSync(targetPath);

        const conflict = await model.findUnique({
            where: {
                category_name: {
                    category: inferredCategory,
                    name: row.name,
                },
            },
            select: { id: true },
        });

        const hasConflict = conflict && String(conflict.id) !== String(row.id);
        if (hasConflict || (sourceExists && targetExists)) {
            conflictCount += 1;
            console.log(`[conflict:${modelLabel}] ${row.category}/${row.name} -> ${inferredCategory}/${row.name}`);
            continue;
        }

        if (!apply) {
            console.log(`[dry-run:${modelLabel}] ${row.category}/${row.name} -> ${inferredCategory}/${row.name}`);
            continue;
        }

        if (sourceExists && !targetExists) {
            await moveFile(sourcePath, targetPath);
            movedCount += 1;
        }

        await moveThumbnail(row.category, inferredCategory, row.name);

        await model.update({
            where: { id: row.id },
            data: {
                category: inferredCategory,
                url: getPublicUrl(inferredCategory, row.name),
                thumbnailUrl: resolveThumbnailAfterMove(inferredCategory, row.name),
            },
        });
        updatedCount += 1;

        console.log(`[applied:${modelLabel}] ${row.category}/${row.name} -> ${inferredCategory}/${row.name}`);
    }

    return {
        movedCount,
        updatedCount,
        conflictCount,
        skippedCount,
    };
}

async function main() {
    const apply = getArgFlag("--apply");
    const includeRecycle = getArgFlag("--include-recycle");

    console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`);
    console.log(`Include recycle rows: ${includeRecycle ? "yes" : "no"}`);

    const activeRows = await prisma.uploadedDocument.findMany({
        where: {
            category: { in: PELAPORAN_CATEGORIES },
            isDeleted: false,
        },
        select: {
            id: true,
            category: true,
            name: true,
            originalName: true,
            url: true,
            thumbnailUrl: true,
        },
        orderBy: [{ updatedAt: "desc" }],
    });

    console.log(`Active rows checked: ${activeRows.length}`);

    const activeResult = await reclassifyRows({
        model: prisma.uploadedDocument,
        modelLabel: "active",
        rows: activeRows,
        apply,
    });

    let recycleResult = {
        movedCount: 0,
        updatedCount: 0,
        conflictCount: 0,
        skippedCount: 0,
    };

    if (includeRecycle) {
        const recycleRows = await prisma.uploadedDocumentRecycle.findMany({
            where: {
                category: { in: PELAPORAN_CATEGORIES },
            },
            select: {
                id: true,
                category: true,
                name: true,
                originalName: true,
                url: true,
                thumbnailUrl: true,
            },
            orderBy: [{ updatedAt: "desc" }],
        });

        console.log(`Recycle rows checked: ${recycleRows.length}`);

        recycleResult = await reclassifyRows({
            model: prisma.uploadedDocumentRecycle,
            modelLabel: "recycle",
            rows: recycleRows,
            apply,
        });
    }

    const totalMoved = activeResult.movedCount + recycleResult.movedCount;
    const totalUpdated = activeResult.updatedCount + recycleResult.updatedCount;
    const totalConflicts = activeResult.conflictCount + recycleResult.conflictCount;
    const totalSkipped = activeResult.skippedCount + recycleResult.skippedCount;

    console.log("--- Summary ---");
    console.log(`Rows updated: ${totalUpdated}`);
    console.log(`Files moved: ${totalMoved}`);
    console.log(`Conflicts: ${totalConflicts}`);
    console.log(`Skipped/no-change: ${totalSkipped}`);

    if (!apply) {
        console.log("Dry-run selesai. Jalankan ulang dengan --apply untuk menerapkan perubahan.");
    }
}

main()
    .catch((error) => {
        console.error("Reclassify pelaporan categories failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
