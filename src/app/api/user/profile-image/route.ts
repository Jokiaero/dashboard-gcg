import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { sessionOptions, SessionData } from "@/lib/session";
import { logAudit } from "@/lib/auditLogger";

const DEFAULT_PROFILE_IMAGE = "/assets/images/faces/face28.png";
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

function safeProfileImagePath(value: string | null | undefined): string {
    const raw = String(value || "").trim();
    if (!raw.startsWith("/assets/images/faces/")) {
        return DEFAULT_PROFILE_IMAGE;
    }
    return raw;
}

function extensionFromFile(fileName: string, mimeType: string): string {
    const ext = path.extname(fileName).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
        return ext === ".jpeg" ? ".jpg" : ext;
    }

    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/webp") return ".webp";
    return "";
}

async function readProfileImage(userId: number): Promise<string> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileImage: true },
    });

    return safeProfileImagePath(user?.profileImage);
}

function cleanupUploadedAvatarForUser(imagePath: string, userId: number) {
    if (!imagePath.startsWith(`/assets/images/faces/user-${userId}-`)) {
        return;
    }

    const absolutePath = path.join(process.cwd(), "public", imagePath.replace(/^\//, ""));
    if (existsSync(absolutePath)) {
        unlinkSync(absolutePath);
    }
}

export async function GET() {
    const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
    if (!session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profileImage = await readProfileImage(session.user.id);
    return NextResponse.json({ profileImage });
}

export async function POST(req: NextRequest) {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        if (!session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
        }

        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: "Format gambar harus JPG, PNG, atau WEBP" }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: "Ukuran gambar maksimal 3MB" }, { status: 400 });
        }

        const extension = extensionFromFile(file.name, file.type);
        if (!extension) {
            return NextResponse.json({ error: "Ekstensi gambar tidak didukung" }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), "public", "assets", "images", "faces");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        const previousImage = await readProfileImage(session.user.id);
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const fileName = `user-${session.user.id}-${Date.now()}${extension}`;
        const absolutePath = path.join(uploadDir, fileName);
        const publicPath = `/assets/images/faces/${fileName}`;

        await writeFile(absolutePath, buffer);

        await prisma.user.update({
            where: { id: session.user.id },
            data: { profileImage: publicPath },
        });

        // Cleanup old uploaded avatar for the same user.
        cleanupUploadedAvatarForUser(previousImage, session.user.id);

        await logAudit(
            "UPDATE_PROFILE_IMAGE",
            session.user.username,
            `Pengguna memperbarui foto profil: ${fileName}`
        );

        return NextResponse.json({ success: true, profileImage: publicPath });
    } catch (error: any) {
        console.error("Profile image upload error:", error);
        return NextResponse.json(
            { error: "Gagal mengunggah foto profil", details: error.message },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const session = await getIronSession<SessionData>(await cookies(), sessionOptions);
        if (!session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const previousImage = await readProfileImage(session.user.id);

        await prisma.user.update({
            where: { id: session.user.id },
            data: { profileImage: null },
        });

        cleanupUploadedAvatarForUser(previousImage, session.user.id);

        await logAudit(
            "DELETE_PROFILE_IMAGE",
            session.user.username,
            "Pengguna menghapus foto profil dan kembali ke avatar default"
        );

        return NextResponse.json({ success: true, profileImage: DEFAULT_PROFILE_IMAGE });
    } catch (error: any) {
        console.error("Profile image delete error:", error);
        return NextResponse.json(
            { error: "Gagal menghapus foto profil", details: error.message },
            { status: 500 }
        );
    }
}
