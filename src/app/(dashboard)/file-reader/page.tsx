"use client";

import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

type ExcelPreviewTable = {
    sheetName: string;
    headers: string[];
    rows: string[][];
};

const MAX_PREVIEW_ROWS = 500;

function normalizeInternalFilePath(rawValue: string): string {
    const value = String(rawValue || "").trim();
    if (!value) return "";

    if (value.startsWith("/assets/")) {
        return value;
    }

    if (/^https?:\/\//i.test(value)) {
        try {
            const parsed = new URL(value);
            if (parsed.pathname.startsWith("/assets/")) {
                return parsed.pathname;
            }
        } catch {
            return "";
        }
    }

    return "";
}

function getFileExtension(filePath: string): string {
    const cleanPath = String(filePath || "").split("?")[0].split("#")[0].toLowerCase();
    const dotIndex = cleanPath.lastIndexOf(".");
    return dotIndex >= 0 ? cleanPath.slice(dotIndex) : "";
}

function detectFileType(filePath: string): "pdf" | "image" | "excel" | "other" {
    const extension = getFileExtension(filePath);

    if (extension === ".pdf") return "pdf";
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].includes(extension)) return "image";
    if ([".xlsx", ".xls"].includes(extension)) return "excel";
    return "other";
}

function normalizeCell(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function extractExcelPreviewTable(sheet: XLSX.WorkSheet): { headers: string[]; rows: string[][] } {
    const sheetRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    if (sheetRows.length === 0) {
        return { headers: [], rows: [] };
    }

    const scanLimit = Math.min(sheetRows.length, 10);
    let headerIndex = 0;
    let bestScore = -1;

    for (let i = 0; i < scanLimit; i += 1) {
        const score = (sheetRows[i] || []).filter((cell) => normalizeCell(cell) !== "").length;
        if (score > bestScore) {
            bestScore = score;
            headerIndex = i;
        }
    }

    const rawHeaders = (sheetRows[headerIndex] || []).map((cell) => normalizeCell(cell));
    const rawDataRows = sheetRows
        .slice(headerIndex + 1)
        .filter((row) => (row || []).some((cell) => normalizeCell(cell) !== ""));

    const maxColumns = Math.max(
        rawHeaders.length,
        ...rawDataRows.map((row) => (row || []).length),
        0
    );

    const headers = Array.from({ length: maxColumns }, (_, index) => {
        const value = normalizeCell(rawHeaders[index]);
        return value || `Kolom ${index + 1}`;
    });

    const rows = rawDataRows.map((row) =>
        Array.from({ length: maxColumns }, (_, colIndex) => normalizeCell((row || [])[colIndex]))
    );

    return { headers, rows };
}

function resolveDisplayName(nameParam: string, filePath: string): string {
    const rawName = String(nameParam || "").trim();
    if (rawName) return rawName;

    const rawFile = String(filePath || "").trim();
    if (!rawFile) return "Dokumen";

    const parts = rawFile.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "Dokumen");
}

export default function FileReaderPage() {
    const searchParams = useSearchParams();

    const requestedFile = searchParams.get("file") || "";
    const requestedName = searchParams.get("name") || "";

    const safeFilePath = useMemo(() => normalizeInternalFilePath(requestedFile), [requestedFile]);
    const displayName = useMemo(() => resolveDisplayName(requestedName, safeFilePath || requestedFile), [requestedName, safeFilePath, requestedFile]);
    const fileType = useMemo(() => detectFileType(safeFilePath), [safeFilePath]);

    const [isExcelLoading, setIsExcelLoading] = useState(false);
    const [excelError, setExcelError] = useState("");
    const [excelPreview, setExcelPreview] = useState<ExcelPreviewTable | null>(null);

    useEffect(() => {
        let isActive = true;

        if (!safeFilePath || fileType !== "excel") {
            setIsExcelLoading(false);
            setExcelError("");
            setExcelPreview(null);
            return () => {
                isActive = false;
            };
        }

        const loadExcelPreview = async () => {
            setIsExcelLoading(true);
            setExcelError("");
            setExcelPreview(null);

            try {
                const response = await fetch(safeFilePath);
                if (!response.ok) {
                    throw new Error("Gagal mengambil file Excel");
                }

                const buffer = await response.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
                const firstSheetName = workbook.SheetNames[0];

                if (!firstSheetName) {
                    if (isActive) {
                        setExcelPreview({ sheetName: "", headers: [], rows: [] });
                    }
                    return;
                }

                const table = extractExcelPreviewTable(workbook.Sheets[firstSheetName]);

                if (isActive) {
                    setExcelPreview({
                        sheetName: firstSheetName,
                        headers: table.headers,
                        rows: table.rows,
                    });
                }
            } catch (error: unknown) {
                if (isActive) {
                    const message = error instanceof Error ? error.message : "Gagal memuat preview Excel";
                    setExcelError(message);
                }
            } finally {
                if (isActive) {
                    setIsExcelLoading(false);
                }
            }
        };

        void loadExcelPreview();

        return () => {
            isActive = false;
        };
    }, [fileType, safeFilePath]);

    const previewRows = excelPreview?.rows.slice(0, MAX_PREVIEW_ROWS) || [];
    const isPreviewTruncated = (excelPreview?.rows.length || 0) > MAX_PREVIEW_ROWS;

    return (
        <div className="container-fluid py-3">
            <div className="card shadow-sm" style={{ borderRadius: 10 }}>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                        <div>
                            <h4 className="mb-1" style={{ color: "#1e293b", fontWeight: 800 }}>Reader Dokumen</h4>
                            <div style={{ fontSize: 12, color: "#64748b" }}>{displayName}</div>
                        </div>
                        <div className="d-flex gap-2 flex-wrap">
                            <Link href="/admin" className="btn btn-sm btn-outline-secondary">
                                Kembali
                            </Link>
                            {safeFilePath && (
                                <>
                                    <a href={safeFilePath} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-primary">
                                        Buka File Asli
                                    </a>
                                    <a href={safeFilePath} download={displayName} className="btn btn-sm btn-primary">
                                        Download
                                    </a>
                                </>
                            )}
                        </div>
                    </div>

                    {!safeFilePath && (
                        <div className="alert alert-danger mb-0">
                            File tidak valid atau tidak diizinkan. Hanya file dari folder /assets yang bisa dibuka.
                        </div>
                    )}

                    {safeFilePath && fileType === "pdf" && (
                        <iframe
                            src={`${safeFilePath}#page=1&toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                            title={`Preview ${displayName}`}
                            style={{ width: "100%", height: "80vh", border: "1px solid #e2e8f0", borderRadius: 8, backgroundColor: "#fff" }}
                        />
                    )}

                    {safeFilePath && fileType === "image" && (
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 12, backgroundColor: "#fff" }}>
                            <Image
                                src={safeFilePath}
                                alt={displayName}
                                width={1600}
                                height={900}
                                unoptimized
                                style={{ width: "100%", height: "auto", borderRadius: 6 }}
                            />
                        </div>
                    )}

                    {safeFilePath && fileType === "excel" && (
                        <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" }}>
                            <div style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", fontSize: 12, color: "#475569" }}>
                                Sheet: <strong>{excelPreview?.sheetName || "-"}</strong>
                            </div>

                            {isExcelLoading ? (
                                <div style={{ padding: 18, color: "#64748b" }}>Memuat preview Excel...</div>
                            ) : excelError ? (
                                <div className="alert alert-warning m-3 mb-0">{excelError}</div>
                            ) : (excelPreview?.headers.length || 0) === 0 ? (
                                <div style={{ padding: 18, color: "#64748b" }}>Tidak ada data untuk ditampilkan.</div>
                            ) : (
                                <div className="table-responsive" style={{ maxHeight: "74vh" }}>
                                    <table className="table table-sm table-bordered mb-0" style={{ fontSize: 12 }}>
                                        <thead className="thead-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                            <tr>
                                                {excelPreview?.headers.map((header, index) => (
                                                    <th key={`${header}-${index}`}>{header}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {(excelPreview?.headers || []).map((_, colIndex) => (
                                                        <td key={`${rowIndex}-${colIndex}`}>{row[colIndex] || "-"}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {isPreviewTruncated && (
                                <div style={{ padding: "8px 12px", borderTop: "1px solid #e2e8f0", fontSize: 11, color: "#64748b", backgroundColor: "#f8fafc" }}>
                                    Preview dibatasi ke {MAX_PREVIEW_ROWS} baris pertama. Gunakan tombol Download untuk melihat seluruh isi file.
                                </div>
                            )}
                        </div>
                    )}

                    {safeFilePath && fileType === "other" && (
                        <div className="alert alert-info mb-0">
                            Format file ini belum mendukung preview langsung. Klik Buka File Asli atau Download.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
