"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { REGULASI_DOCS_BY_SLUG } from "@/lib/regulasiDocuments";

export default function RegulasiPdfPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;
    const doc = REGULASI_DOCS_BY_SLUG[slug];
    const [isLoaded, setIsLoaded] = useState(false);
    const [isCheckingFile, setIsCheckingFile] = useState(true);
    const [fileExists, setFileExists] = useState(true);
    const [resolvedPdfPath, setResolvedPdfPath] = useState<string | undefined>(undefined);
    const [cacheToken, setCacheToken] = useState<number>(Date.now());

    useEffect(() => {
        setIsLoaded(false);
        setFileExists(true);
        setIsCheckingFile(true);
        setResolvedPdfPath(undefined);

        if (!doc) {
            setIsCheckingFile(false);
            return;
        }

        if (!doc.pdfPath) {
            setFileExists(false);
            setIsCheckingFile(false);
            return;
        }

        let isActive = true;

        const verifyPdf = async () => {
            try {
                const candidatePaths = [
                    doc.pdfPath,
                    ...(doc.fallbackPdfPaths ?? []),
                ].filter(Boolean) as string[];

                let availablePath: string | undefined;
                for (const candidatePath of candidatePaths) {
                    const response = await fetch(candidatePath, {
                        method: "HEAD",
                        cache: "no-store",
                    });
                    if (response.ok) {
                        availablePath = candidatePath;
                        break;
                    }
                }

                if (isActive) {
                    setFileExists(Boolean(availablePath));
                    setResolvedPdfPath(availablePath);
                    if (availablePath) {
                        setCacheToken(Date.now());
                    }
                }
            } catch {
                if (isActive) {
                    setFileExists(false);
                    setResolvedPdfPath(undefined);
                }
            } finally {
                if (isActive) {
                    setIsCheckingFile(false);
                }
            }
        };

        verifyPdf();

        return () => {
            isActive = false;
        };
    }, [doc, slug]);

    if (!doc) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: "60vh" }}>
                <div className="text-center">
                    <i className="icon-close" style={{ fontSize: 48, color: "#ef4444" }}></i>
                    <h4 className="mt-3 text-slate-700">Dokumen tidak ditemukan</h4>
                    <p className="text-slate-500 mb-4">Regulasi yang kamu cari tidak tersedia.</p>
                    <button className="btn btn-sm btn-success" onClick={() => router.back()}>
                        Kembali
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="main-panel" style={{ width: "100%" }}>
            <div className="content-wrapper">
                {/* Header */}
                <div className="page-header mb-3">
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                        <button
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                            onClick={() => router.back()}
                            style={{ borderRadius: 8 }}
                        >
                            <i className="icon-arrow-left" style={{ fontSize: 14 }}></i>
                            <span>Kembali</span>
                        </button>
                        <div>
                            <h3 className="page-title mb-0" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
                                {doc.title}
                            </h3>
                            <p className="text-muted mb-0" style={{ fontSize: "0.82rem" }}>
                                {doc.subtitle}
                            </p>
                        </div>
                        <div className="ms-auto d-flex gap-2">
                            {resolvedPdfPath && fileExists && (
                                <a
                                    href={resolvedPdfPath}
                                    download
                                    className="btn btn-sm btn-success d-flex align-items-center gap-1"
                                    style={{ borderRadius: 8 }}
                                >
                                    <i className="icon-download" style={{ fontSize: 14 }}></i>
                                    <span>Unduh PDF</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* PDF Viewer Card */}
                <div
                    className="card"
                    style={{
                        borderRadius: 16,
                        overflow: "hidden",
                        border: "none",
                        boxShadow: "0 4px 24px 0 rgba(43,76,61,0.10)",
                        minHeight: "80vh",
                    }}
                >
                    {isCheckingFile && (
                        <div
                            className="d-flex flex-column align-items-center justify-content-center"
                            style={{ height: "80vh", background: "#f8fafc" }}
                        >
                            <div
                                className="spinner-border text-success mb-3"
                                role="status"
                                style={{ width: 40, height: 40 }}
                            >
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                                Memuat dokumen PDF…
                            </p>
                        </div>
                    )}
                    {!isCheckingFile && !fileExists && (
                        <div
                            className="d-flex flex-column align-items-center justify-content-center"
                            style={{ height: "80vh", background: "#f8fafc" }}
                        >
                            <i className="icon-alert-circle" style={{ fontSize: 48, color: "#f59e0b" }}></i>
                            <h5 className="mt-3 text-slate-700">File tidak ada</h5>
                            <p className="text-slate-500 mb-4" style={{ maxWidth: 400, textAlign: "center" }}>
                                File PDF untuk dokumen ini tidak tersedia. Pastikan file ada di folder yang sesuai.
                            </p>
                            <button className="btn btn-sm btn-success" onClick={() => router.back()}>
                                Kembali
                            </button>
                        </div>
                    )}
                    {!isCheckingFile && fileExists && (
                        <>
                            {!isLoaded && (
                                <div
                                    className="d-flex flex-column align-items-center justify-content-center"
                                    style={{ height: "80vh", background: "#f8fafc" }}
                                >
                                    <div
                                        className="spinner-border text-success mb-3"
                                        role="status"
                                        style={{ width: 40, height: 40 }}
                                    >
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                    <p className="text-muted" style={{ fontSize: "0.9rem" }}>
                                        Memuat dokumen PDF…
                                    </p>
                                </div>
                            )}
                            <iframe
                                src={resolvedPdfPath ? `${resolvedPdfPath}?v=${cacheToken}#toolbar=1&navpanes=1&scrollbar=1` : undefined}
                                title={doc.title}
                                width="100%"
                                style={{
                                    height: "82vh",
                                    border: "none",
                                    display: isLoaded ? "block" : "none",
                                }}
                                onLoad={() => setIsLoaded(true)}
                                onError={() => setFileExists(false)}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
