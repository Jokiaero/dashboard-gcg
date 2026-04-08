import { existsSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const PDF_EXTENSION = ".pdf";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfJsPromise: Promise<PdfJsModule> | null = null;

function getPdfJs() {
    if (!pdfJsPromise) {
        pdfJsPromise = import("pdfjs-dist/legacy/build/pdf.mjs");
    }
    return pdfJsPromise;
}

function isImageFileName(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return IMAGE_EXTENSIONS.has(ext);
}

function isPdfFileName(fileName: string): boolean {
    const ext = path.extname(fileName).toLowerCase();
    return ext === PDF_EXTENSION;
}

function toThumbnailFileName(fileName: string): string {
    return `${path.parse(fileName).name}.png`;
}

function getThumbnailDiskPath(category: string, fileName: string): string {
    return path.join(process.cwd(), "public", "assets", "_thumbnails", category, toThumbnailFileName(fileName));
}

function getThumbnailPublicUrl(category: string, fileName: string): string {
    return `/assets/_thumbnails/${category}/${toThumbnailFileName(fileName)}`;
}

function getOriginalPublicUrl(category: string, fileName: string): string {
    return `/assets/${category}/${fileName}`;
}

async function renderPdfFirstPageToPng(pdfPath: string, pngPath: string): Promise<void> {
    const pdfBuffer = await readFile(pdfPath);
    const pdfjs = await getPdfJs();

    const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfBuffer),
        disableFontFace: true,
        useSystemFonts: true,
        isEvalSupported: false,
    });

    const pdfDocument = await loadingTask.promise;

    try {
        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 1.4 });
        const width = Math.max(1, Math.ceil(viewport.width));
        const height = Math.max(1, Math.ceil(viewport.height));

        const canvas = createCanvas(width, height);
        const context = canvas.getContext("2d");

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);

        const renderParams: Parameters<typeof page.render>[0] = {
            canvas: canvas as unknown as HTMLCanvasElement,
            canvasContext: context as unknown as CanvasRenderingContext2D,
            viewport,
        };

        await page.render(renderParams).promise;

        await mkdir(path.dirname(pngPath), { recursive: true });
        await writeFile(pngPath, canvas.toBuffer("image/png"));
    } finally {
        await loadingTask.destroy();
    }
}

export async function generateDocumentThumbnail(params: {
    category: string;
    fileName: string;
    filePath: string;
    publicUrl?: string;
}): Promise<string | null> {
    if (isImageFileName(params.fileName)) {
        return params.publicUrl ?? getOriginalPublicUrl(params.category, params.fileName);
    }

    if (!isPdfFileName(params.fileName)) {
        await removeDocumentThumbnail(params.category, params.fileName);
        return null;
    }

    const thumbnailDiskPath = getThumbnailDiskPath(params.category, params.fileName);

    try {
        await renderPdfFirstPageToPng(params.filePath, thumbnailDiskPath);
        return getThumbnailPublicUrl(params.category, params.fileName);
    } catch (error) {
        console.error("Generate document thumbnail error:", error);
        return null;
    }
}

export function resolveExistingThumbnailUrl(category: string, fileName: string): string | null {
    if (isImageFileName(fileName)) {
        return getOriginalPublicUrl(category, fileName);
    }

    if (!isPdfFileName(fileName)) {
        return null;
    }

    const thumbnailPath = getThumbnailDiskPath(category, fileName);
    if (!existsSync(thumbnailPath)) {
        return null;
    }

    return getThumbnailPublicUrl(category, fileName);
}

export async function removeDocumentThumbnail(category: string, fileName: string): Promise<void> {
    if (!isPdfFileName(fileName)) {
        return;
    }

    const thumbnailPath = getThumbnailDiskPath(category, fileName);
    if (!existsSync(thumbnailPath)) {
        return;
    }

    try {
        await unlink(thumbnailPath);
    } catch (error) {
        console.error("Remove document thumbnail error:", error);
    }
}
