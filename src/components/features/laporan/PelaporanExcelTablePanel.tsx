"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type PelaporanSourceOption = {
    category: string;
    name: string;
    url: string;
    modifiedAt: string;
    size: number;
    type: string;
};

type PelaporanSheetMerge = {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
};

type PelaporanTableApiResponse = {
    source: string;
    tableHeaders?: string[];
    tableHeaderGroups?: string[];
    tableRows?: string[][];
    rawMatrix?: string[][];
    rawMerges?: PelaporanSheetMerge[];
    rawColWidths?: number[];
    rawRowHeights?: number[];
    rawHiddenCols?: boolean[];
    rawHiddenRows?: boolean[];
    sourceFile?: PelaporanSourceOption | null;
    availableSources?: PelaporanSourceOption[];
};

type PelaporanExcelTablePanelProps = {
    category: "pelaporan_wbs" | "pelaporan_risiko" | "pelaporan_penyuapan" | "pelaporan_ppg" | "pelaporan_survey" | "approval_kepatuhan";
    title: string;
    sourceName?: string;
    onSourceNameChange?: (sourceName: string) => void;
};

function normalizeHeaderCells(headers: string[]): string[] {
    if (headers.length === 0) {
        return ["Kolom 1"];
    }

    return headers.map((header, index) => {
        const normalized = String(header || "").trim();
        return normalized || `Kolom ${index + 1}`;
    });
}

function normalizeHeaderGroups(groups: string[], headers: string[]): string[] {
    return headers.map((header, index) => {
        const rawGroup = String(groups[index] || "").trim();
        return rawGroup || header;
    });
}

function normalizeRows(rows: string[][], columnCount: number): string[][] {
    return rows.map((row) =>
        Array.from({ length: columnCount }, (_, index) => String((row || [])[index] || ""))
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return "Terjadi kesalahan yang tidak diketahui";
}

export default function PelaporanExcelTablePanel({
    category,
    title,
    sourceName,
    onSourceNameChange,
}: PelaporanExcelTablePanelProps) {
    const [selectedSourceNameInternal, setSelectedSourceNameInternal] = useState("");
    const [crudStatus, setCrudStatus] = useState<{ ok: boolean; msg: string } | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [draftHeaders, setDraftHeaders] = useState<string[]>([]);
    const [draftHeaderGroups, setDraftHeaderGroups] = useState<string[]>([]);
    const [draftRows, setDraftRows] = useState<string[][]>([]);
    const queryClient = useQueryClient();

    const isSourceControlled = typeof sourceName === "string" && typeof onSourceNameChange === "function";
    const selectedSourceName = isSourceControlled ? String(sourceName) : selectedSourceNameInternal;

    const updateSelectedSourceName = (nextValue: string) => {
        if (isSourceControlled) {
            onSourceNameChange(nextValue);
            return;
        }

        setSelectedSourceNameInternal(nextValue);
    };

    const { data, isLoading } = useQuery<PelaporanTableApiResponse>({
        queryKey: ["pelaporanTableData", category, selectedSourceName || "auto"],
        queryFn: async () => {
            const params = new URLSearchParams({ category });
            if (selectedSourceName.trim()) {
                params.set("sourceName", selectedSourceName);
            }

            const res = await fetch(`/api/dashboard/pelaporan-table?${params.toString()}`);
            if (!res.ok) {
                throw new Error("Gagal memuat tabel pelaporan");
            }

            return res.json() as Promise<PelaporanTableApiResponse>;
        },
        staleTime: 60_000,
    });

    const sourceOptions = Array.isArray(data?.availableSources) ? data.availableSources : [];
    const activeSourceName = String(data?.sourceFile?.name || "");
    const selectedSourceValue = selectedSourceName || activeSourceName || sourceOptions[0]?.name || "";

    const excelHeaders = Array.isArray(data?.tableHeaders)
        ? data.tableHeaders.map((header, index) => {
            const normalized = String(header ?? "").trim();
            return normalized || `Kolom ${index + 1}`;
        })
        : [];

    const excelHeaderGroups = excelHeaders.map((header, index) => {
        const rawGroup = Array.isArray(data?.tableHeaderGroups)
            ? String(data.tableHeaderGroups[index] ?? "").trim()
            : "";
        return rawGroup || header;
    });

    const excelRows = Array.isArray(data?.tableRows)
        ? data.tableRows.map((row) =>
            Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []
        )
        : [];

    const rawMatrix = Array.isArray(data?.rawMatrix)
        ? data.rawMatrix.map((row) =>
            Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : []
        )
        : [];

    const rawMerges = Array.isArray(data?.rawMerges)
        ? data.rawMerges
            .map((merge) => ({
                startRow: Number(merge?.startRow ?? -1),
                startCol: Number(merge?.startCol ?? -1),
                endRow: Number(merge?.endRow ?? -1),
                endCol: Number(merge?.endCol ?? -1),
            }))
            .filter((merge) =>
                Number.isInteger(merge.startRow) &&
                Number.isInteger(merge.startCol) &&
                Number.isInteger(merge.endRow) &&
                Number.isInteger(merge.endCol) &&
                merge.startRow >= 0 &&
                merge.startCol >= 0 &&
                merge.endRow >= merge.startRow &&
                merge.endCol >= merge.startCol
            )
        : [];

    const rawColWidths = Array.isArray(data?.rawColWidths)
        ? data.rawColWidths
            .map((width) => Number(width))
            .map((width) => (Number.isFinite(width) && width > 0 ? Math.round(width) : 120))
        : [];

    const rawRowHeights = Array.isArray(data?.rawRowHeights)
        ? data.rawRowHeights
            .map((height) => Number(height))
            .map((height) => (Number.isFinite(height) && height > 0 ? Math.round(height) : 0))
        : [];

    const rawHiddenCols = Array.isArray(data?.rawHiddenCols)
        ? data.rawHiddenCols.map((flag) => Boolean(flag))
        : [];

    const rawHiddenRows = Array.isArray(data?.rawHiddenRows)
        ? data.rawHiddenRows.map((flag) => Boolean(flag))
        : [];

    const saveTableMutation = useMutation({
        mutationFn: async () => {
            if (!selectedSourceValue) {
                throw new Error("Pilih file sumber terlebih dahulu");
            }

            const normalizedHeaders = normalizeHeaderCells(draftHeaders);
            const normalizedGroups = normalizeHeaderGroups(draftHeaderGroups, normalizedHeaders);
            const normalizedRows = normalizeRows(draftRows, normalizedHeaders.length);

            const res = await fetch("/api/dashboard/pelaporan-table", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category,
                    sourceName: selectedSourceValue,
                    tableHeaders: normalizedHeaders,
                    tableHeaderGroups: normalizedGroups,
                    tableRows: normalizedRows,
                }),
            });

            const json = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(String(json?.error || "Gagal menyimpan perubahan tabel"));
            }

            return true;
        },
        onSuccess: async () => {
            setIsEditMode(false);
            setCrudStatus({ ok: true, msg: "✓ Perubahan tabel berhasil disimpan." });
            await queryClient.invalidateQueries({ queryKey: ["pelaporanTableData", category] });
        },
        onError: (error: unknown) => {
            setCrudStatus({ ok: false, msg: `✗ ${getErrorMessage(error)}` });
        },
    });

    const viewHeaders = isEditMode ? normalizeHeaderCells(draftHeaders) : excelHeaders;
    const viewHeaderGroups = isEditMode
        ? normalizeHeaderGroups(draftHeaderGroups, viewHeaders)
        : excelHeaderGroups;
    const viewRows = isEditMode
        ? normalizeRows(draftRows, viewHeaders.length)
        : normalizeRows(excelRows, viewHeaders.length);

    const useRawExcelOneToOneView =
        !isEditMode &&
        category === "pelaporan_penyuapan" &&
        rawMatrix.length > 0;

    const viewColumnCount = viewHeaders.length;
    const viewRowCount = viewRows.length;
    const rawColumnCount = rawMatrix.reduce((acc, row) => Math.max(acc, row.length), 0);
    const rawRowCount = rawMatrix.length;

    const rawRenderColumns = useRawExcelOneToOneView
        ? (() => {
            const visible = Array.from({ length: rawColumnCount }, (_, index) => index)
                .filter((index) => !rawHiddenCols[index]);

            return visible.length > 0
                ? visible
                : Array.from({ length: rawColumnCount }, (_, index) => index);
        })()
        : [];

    const rawRenderRows = useRawExcelOneToOneView
        ? (() => {
            const visible = Array.from({ length: rawRowCount }, (_, index) => index)
                .filter((index) => !rawHiddenRows[index]);

            return visible.length > 0
                ? visible
                : Array.from({ length: rawRowCount }, (_, index) => index);
        })()
        : [];

    const displayColumnCount = useRawExcelOneToOneView ? rawRenderColumns.length : viewColumnCount;
    const displayRowCount = useRawExcelOneToOneView ? rawRenderRows.length : viewRowCount;

    const rawColumnWidthMap = new Map<number, number>();
    if (useRawExcelOneToOneView) {
        rawRenderColumns.forEach((colIndex) => {
            const width = Math.max(48, Math.min(520, rawColWidths[colIndex] || 120));
            rawColumnWidthMap.set(colIndex, width);
        });
    }

    const headerGroupBlocks = (() => {
        const blocks: Array<{ label: string; start: number; span: number; singleRow: boolean }> = [];

        for (let i = 0; i < viewHeaders.length; ) {
            const label = viewHeaderGroups[i] || viewHeaders[i] || `Kolom ${i + 1}`;
            let end = i + 1;
            while (end < viewHeaders.length && viewHeaderGroups[end] === label) {
                end += 1;
            }

            const span = end - i;
            const singleRow = viewHeaders.slice(i, end).every((header) => header === label);
            blocks.push({ label, start: i, span, singleRow });
            i = end;
        }

        return blocks;
    })();

    const hasGroupedHeader = !isEditMode && headerGroupBlocks.some((block) => !block.singleRow);
    const hasExcelTable = useRawExcelOneToOneView ? rawRenderRows.length > 0 && rawRenderColumns.length > 0 : viewHeaders.length > 0;

    const rawHiddenCellSet = new Set<string>();
    const rawSpanMap = new Map<string, { rowSpan: number; colSpan: number }>();

    if (useRawExcelOneToOneView) {
        rawMerges.forEach((merge) => {
            if (merge.startRow < 0 || merge.startRow >= rawRowCount) {
                return;
            }

            const coveredVisibleCols = rawRenderColumns.filter(
                (colIndex) => colIndex >= merge.startCol && colIndex <= merge.endCol
            );
            const coveredVisibleRows = rawRenderRows.filter(
                (rowIndex) => rowIndex >= merge.startRow && rowIndex <= merge.endRow
            );

            if (coveredVisibleCols.length === 0 || coveredVisibleRows.length === 0) {
                return;
            }

            const startRow = coveredVisibleRows[0];
            const startVisibleCol = coveredVisibleCols[0];
            const rowSpan = coveredVisibleRows.length;
            const colSpan = coveredVisibleCols.length;

            rawSpanMap.set(`${startRow}:${startVisibleCol}`, { rowSpan, colSpan });

            coveredVisibleRows.forEach((rowIndex) => {
                coveredVisibleCols.forEach((colIndex) => {
                    if (rowIndex === startRow && colIndex === startVisibleCol) {
                        return;
                    }

                    rawHiddenCellSet.add(`${rowIndex}:${colIndex}`);
                });
            });
        });
    }

    const addColumn = () => {
        const baseHeaders = normalizeHeaderCells(draftHeaders);
        const baseGroups = normalizeHeaderGroups(draftHeaderGroups, baseHeaders);
        const nextHeaders = [...baseHeaders, `Kolom ${baseHeaders.length + 1}`];
        const nextGroups = [...baseGroups, nextHeaders[nextHeaders.length - 1]];

        setDraftHeaders(nextHeaders);
        setDraftHeaderGroups(nextGroups);
        setDraftRows((prevRows) => prevRows.map((row) => [...row, ""]));
    };

    const removeColumn = (columnIndex: number) => {
        const headerCount = normalizeHeaderCells(draftHeaders).length;
        if (headerCount <= 1) {
            setCrudStatus({ ok: false, msg: "✗ Minimal harus ada 1 kolom." });
            return;
        }

        setDraftHeaders((prev) => prev.filter((_, index) => index !== columnIndex));
        setDraftHeaderGroups((prev) => prev.filter((_, index) => index !== columnIndex));
        setDraftRows((prevRows) => prevRows.map((row) => row.filter((_, index) => index !== columnIndex)));
    };

    const addRow = () => {
        const columnCount = normalizeHeaderCells(draftHeaders).length;
        setDraftRows((prevRows) => [...prevRows, Array.from({ length: columnCount }, () => "")]);
    };

    const removeRow = (rowIndex: number) => {
        setDraftRows((prevRows) => prevRows.filter((_, index) => index !== rowIndex));
    };

    const startEditMode = () => {
        const initialHeaders = normalizeHeaderCells(excelHeaders);
        const initialGroups = normalizeHeaderGroups(
            Array.isArray(data?.tableHeaderGroups)
                ? data.tableHeaderGroups.map((group) => String(group ?? ""))
                : [],
            initialHeaders
        );
        const initialRows = normalizeRows(excelRows, initialHeaders.length);

        setDraftHeaders(initialHeaders);
        setDraftHeaderGroups(initialGroups);
        setDraftRows(initialRows);
        setIsEditMode(true);
        setCrudStatus(null);
    };

    const cancelEditMode = () => {
        setIsEditMode(false);
        setCrudStatus(null);
    };

    const excelHeaderStyle = {
        backgroundColor: "#fff200",
        color: "#111827",
        border: "1px solid #111827",
        fontWeight: 700,
        textAlign: "center" as const,
        verticalAlign: "middle" as const,
        whiteSpace: "nowrap" as const,
    };

    const excelBodyCellStyle = {
        border: "1px solid #111827",
        verticalAlign: "middle" as const,
    };

    return (
        <div className="row mt-3">
            <div className="col-12 grid-margin stretch-card">
                <div className="card">
                    <div className="card-body">
                        <h4 className="card-title">{title}</h4>

                        <div className="row align-items-end mb-3">
                            <div className="col-md-7 mb-2 mb-md-0">
                                <label className="mb-1" style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                                    Pilih File Sumber Tabel
                                </label>
                                <select
                                    className="form-control form-control-sm"
                                    value={selectedSourceValue}
                                    onChange={(event) => {
                                        updateSelectedSourceName(event.target.value);
                                        setCrudStatus(null);
                                    }}
                                    disabled={isEditMode || saveTableMutation.isPending}
                                >
                                    {sourceOptions.length === 0 ? (
                                        <option value="">Belum ada file sumber</option>
                                    ) : (
                                        sourceOptions.map((source) => (
                                            <option key={source.name} value={source.name}>
                                                {source.name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div className="col-md-5 text-md-right">
                                <small className="text-muted">File aktif: {activeSourceName || "-"}</small>
                            </div>
                        </div>

                        <div className="d-flex flex-wrap gap-2 mb-3">
                        </div>

                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {!isEditMode ? (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={startEditMode}
                                    disabled={!selectedSourceValue}
                                >
                                    Edit Tabel
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-success"
                                        onClick={() => saveTableMutation.mutate()}
                                        disabled={saveTableMutation.isPending}
                                    >
                                        {saveTableMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-secondary"
                                        onClick={cancelEditMode}
                                        disabled={saveTableMutation.isPending}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={addColumn}
                                        disabled={saveTableMutation.isPending}
                                    >
                                        Tambah Kolom
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={addRow}
                                        disabled={saveTableMutation.isPending}
                                    >
                                        Tambah Baris
                                    </button>
                                </>
                            )}
                        </div>

                        {crudStatus && (
                            <div
                                style={{
                                    marginBottom: 12,
                                    padding: "8px 12px",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    backgroundColor: crudStatus.ok ? "#dcfce7" : "#fee2e2",
                                    color: crudStatus.ok ? "#166534" : "#991b1b",
                                    border: `1px solid ${crudStatus.ok ? "#bbf7d0" : "#fecaca"}`,
                                }}
                            >
                                {crudStatus.msg}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="alert alert-secondary py-2">Memuat tabel dari file Excel...</div>
                        ) : (
                            <div
                                className="table-responsive"
                                style={{
                                    maxHeight: useRawExcelOneToOneView ? "72vh" : undefined,
                                    border: useRawExcelOneToOneView ? "1px solid #e2e8f0" : undefined,
                                    borderRadius: useRawExcelOneToOneView ? 8 : undefined,
                                    backgroundColor: "#fff",
                                }}
                            >
                                <table
                                    className={useRawExcelOneToOneView ? "mb-0" : "table table-sm mb-0"}
                                    style={{
                                        borderCollapse: "collapse",
                                        width: useRawExcelOneToOneView ? "max-content" : "100%",
                                        minWidth: useRawExcelOneToOneView ? "100%" : undefined,
                                        tableLayout: "auto",
                                    }}
                                >
                                    {hasExcelTable ? (
                                        useRawExcelOneToOneView ? (
                                            <tbody>
                                                {rawRenderRows.map((rawRowIndex) => (
                                                    <tr
                                                        key={`raw-${rawRowIndex}`}
                                                        style={rawRowHeights[rawRowIndex] > 0 ? { height: rawRowHeights[rawRowIndex] } : undefined}
                                                    >
                                                        {rawRenderColumns.map((colIndex) => {
                                                            const cellKey = `${rawRowIndex}:${colIndex}`;
                                                            if (rawHiddenCellSet.has(cellKey)) {
                                                                return null;
                                                            }

                                                            const span = rawSpanMap.get(cellKey);
                                                            const cellValue = String((rawMatrix[rawRowIndex] || [])[colIndex] || "");
                                                            const cellWidth = span?.colSpan
                                                                ? Array.from({ length: span.colSpan }, (_, offset) => rawColumnWidthMap.get(colIndex + offset) || 120)
                                                                    .reduce((sum, width) => sum + width, 0)
                                                                : rawColumnWidthMap.get(colIndex) || 120;

                                                            return (
                                                                <td
                                                                    key={cellKey}
                                                                    rowSpan={span?.rowSpan}
                                                                    colSpan={span?.colSpan}
                                                                    style={{
                                                                        ...excelBodyCellStyle,
                                                                        backgroundColor: "#ffffff",
                                                                        fontWeight: 500,
                                                                        whiteSpace: "pre-wrap",
                                                                        wordBreak: "normal",
                                                                        overflowWrap: "normal",
                                                                        lineHeight: 1.35,
                                                                        fontSize: 12,
                                                                        padding: "8px 10px",
                                                                        width: cellWidth,
                                                                        minWidth: cellWidth,
                                                                        maxWidth: cellWidth,
                                                                        verticalAlign: "top",
                                                                        textAlign: "left",
                                                                    }}
                                                                >
                                                                    {cellValue || <span>&nbsp;</span>}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        ) : (
                                            <>
                                                {isEditMode ? (
                                                    <thead>
                                                        <tr>
                                                            <th style={excelHeaderStyle}>#</th>
                                                            {viewHeaders.map((_, colIndex) => (
                                                                <th key={`group-${colIndex}`} style={excelHeaderStyle}>
                                                                    <input
                                                                        className="form-control form-control-sm"
                                                                        style={{ minWidth: 160 }}
                                                                        value={viewHeaderGroups[colIndex] || ""}
                                                                        onChange={(event) => {
                                                                            const next = [...viewHeaderGroups];
                                                                            next[colIndex] = event.target.value;
                                                                            setDraftHeaderGroups(next);
                                                                        }}
                                                                    />
                                                                </th>
                                                            ))}
                                                            <th style={excelHeaderStyle}>Aksi</th>
                                                        </tr>
                                                        <tr>
                                                            <th style={excelHeaderStyle}>#</th>
                                                            {viewHeaders.map((header, colIndex) => (
                                                                <th key={`header-${colIndex}`} style={excelHeaderStyle}>
                                                                    <div className="d-flex gap-1 align-items-center">
                                                                        <input
                                                                            className="form-control form-control-sm"
                                                                            style={{ minWidth: 160 }}
                                                                            value={header}
                                                                            onChange={(event) => {
                                                                                const next = [...viewHeaders];
                                                                                next[colIndex] = event.target.value;
                                                                                setDraftHeaders(next);
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            className="btn btn-sm btn-outline-danger"
                                                                            onClick={() => removeColumn(colIndex)}
                                                                            title="Hapus kolom"
                                                                        >
                                                                            Hapus
                                                                        </button>
                                                                    </div>
                                                                </th>
                                                            ))}
                                                            <th style={excelHeaderStyle}>Aksi</th>
                                                        </tr>
                                                    </thead>
                                                ) : hasGroupedHeader ? (
                                                    <thead>
                                                        <tr>
                                                            {headerGroupBlocks.map((block, index) => (
                                                                <th
                                                                    key={`${block.label}-${index}`}
                                                                    colSpan={block.singleRow ? undefined : block.span}
                                                                    rowSpan={block.singleRow ? 2 : undefined}
                                                                    style={excelHeaderStyle}
                                                                >
                                                                    {block.label}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                        <tr>
                                                            {headerGroupBlocks.flatMap((block, blockIndex) =>
                                                                block.singleRow
                                                                    ? []
                                                                    : excelHeaders
                                                                        .slice(block.start, block.start + block.span)
                                                                        .map((header, colOffset) => (
                                                                            <th key={`${blockIndex}-${block.start + colOffset}`} style={excelHeaderStyle}>
                                                                                {header}
                                                                            </th>
                                                                        ))
                                                            )}
                                                        </tr>
                                                    </thead>
                                                ) : (
                                                    <thead>
                                                        <tr>
                                                            {viewHeaders.map((header, index) => (
                                                                <th key={`${header}-${index}`} style={excelHeaderStyle}>{header}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                )}
                                                <tbody>
                                                    {viewRows.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={viewHeaders.length + (isEditMode ? 2 : 0)} className="text-center text-muted py-4" style={excelBodyCellStyle}>
                                                                Belum ada data pada file Excel.
                                                            </td>
                                                        </tr>
                                                    ) : viewRows.map((row, rowIndex) => (
                                                        <tr key={rowIndex}>
                                                            {isEditMode && (
                                                                <td style={excelBodyCellStyle} className="text-center text-muted">
                                                                    {rowIndex + 1}
                                                                </td>
                                                            )}
                                                            {viewHeaders.map((_, colIndex) => (
                                                                <td key={`${rowIndex}-${colIndex}`} style={excelBodyCellStyle}>
                                                                    {isEditMode ? (
                                                                        <input
                                                                            className="form-control form-control-sm"
                                                                            value={row[colIndex] || ""}
                                                                            onChange={(event) => {
                                                                                const nextRows = viewRows.map((currentRow) => [...currentRow]);
                                                                                nextRows[rowIndex][colIndex] = event.target.value;
                                                                                setDraftRows(nextRows);
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        row[colIndex] || "-"
                                                                    )}
                                                                </td>
                                                            ))}
                                                            {isEditMode && (
                                                                <td style={excelBodyCellStyle}>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger"
                                                                        onClick={() => removeRow(rowIndex)}
                                                                        title="Hapus baris"
                                                                    >
                                                                        Hapus
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </>
                                        )
                                    ) : (
                                        <tbody>
                                            <tr>
                                                <td className="text-center text-muted py-4">Belum ada data pada file Excel.</td>
                                            </tr>
                                        </tbody>
                                    )}
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
