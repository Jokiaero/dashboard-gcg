import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const [statusData, departmentData] = await Promise.all([
            prisma.dataLaporan.groupBy({
                by: ['status_approved'],
                _count: {
                    id: true,
                },
            }),
            prisma.dataLaporan.groupBy({
                by: ['department'],
                _count: {
                    id: true,
                },
                orderBy: {
                    _count: {
                        id: 'desc',
                    },
                },
                take: 10,
            }),
        ]);

        const statusStats = statusData.map((item) => ({
            name: item.status_approved || "PENDING",
            value: item._count.id,
        }));

        const departmentStats = departmentData.map((item) => ({
            name: item.department || "Unknown",
            value: item._count.id,
        }));

        return NextResponse.json({
            statusStats,
            departmentStats,
        });
    } catch (error) {
        console.error("Failed to fetch dashboard stats", error);
        return NextResponse.json(
            { error: "Failed to fetch dashboard stats" },
            { status: 500 }
        );
    }
}
