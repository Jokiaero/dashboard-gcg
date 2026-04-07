import { NextResponse } from "next/server";
import { getApprovalKepatuhanSeries } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const series = await getApprovalKepatuhanSeries("approval_kepatuhan");

        const latestTwoYears = [...series].sort((a, b) => b.year - a.year).slice(0, 2);
        const current = latestTwoYears[0] ?? { year: new Date().getFullYear(), value: 0 };
        const previous = latestTwoYears[1] ?? { year: current.year - 1, value: 0 };
        const average = series.length > 0
            ? series.reduce((sum, item) => sum + item.value, 0) / series.length
            : 0;

        return NextResponse.json({
            currentYear: current.year,
            currentValue: current.value,
            previousYear: previous.year,
            previousValue: previous.value,
            average,
            hasData: series.length > 0,
        });
    } catch (error) {
        console.error("Failed to fetch approval kepatuhan stats", error);
        return NextResponse.json(
            { error: "Failed to fetch approval kepatuhan stats" },
            { status: 500 }
        );
    }
}
