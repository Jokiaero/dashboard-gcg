import { prisma } from "@/lib/prisma";

export async function logAudit(action: string, username: string, details?: string) {
    try {
        await prisma.auditLog.create({
            data: {
                action,
                username,
                details
            }
        });
    } catch (error) {
        console.error("Failed to write audit log:", error);
    }
}
