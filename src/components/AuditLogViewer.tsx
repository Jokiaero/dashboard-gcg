"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";

type AuditLog = {
    id: number;
    action: string;
    username: string;
    details: string | null;
    createdAt: string;
};

export default function AuditLogViewer() {
    const { data: logs, isLoading, error } = useQuery<AuditLog[]>({
        queryKey: ["auditLogs"],
        queryFn: async () => {
            const res = await fetch("/api/audit");
            if (!res.ok) throw new Error("Gagal memuat log");
            return res.json();
        }
    });

    const getActionColor = (action: string) => {
        if (action.includes("CREATE")) return "bg-emerald-100 text-emerald-800";
        if (action.includes("UPDATE")) return "bg-blue-100 text-blue-800";
        if (action.includes("DELETE")) return "bg-rose-100 text-rose-800";
        if (action.includes("LOGIN")) return "bg-purple-100 text-purple-800";
        return "bg-slate-100 text-slate-800";
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Audit Trail</h2>
                    <p className="text-sm text-slate-500 mt-1">Rekam jejak aktivitas operasional di dalam sistem.</p>
                </div>
                <div className="bg-slate-50 text-slate-500 px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-100">
                    <i className="ti-time mr-2"></i> {logs?.length || 0} Histori Terbaru
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="spinner-border text-primary" role="status">
                        <span className="sr-only">Loading...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="bg-rose-50 text-rose-600 p-4 rounded-lg text-center font-medium">
                    {(error as Error).message} / Anda tidak memiliki akses ke halaman ini.
                </div>
            ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold w-48">Waktu (Timestamp)</th>
                                <th className="px-6 py-4 font-semibold w-32">Aksi</th>
                                <th className="px-6 py-4 font-semibold w-48">Pengguna</th>
                                <th className="px-6 py-4 font-semibold">Keterangan / Detail</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="text-center text-slate-400 py-8">
                                        Belum ada aktivitas yang direkam.
                                    </td>
                                </tr>
                            ) : (
                                logs?.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 font-medium">
                                            {new Date(log.createdAt).toLocaleString('id-ID', {
                                                year: 'numeric', month: 'short', day: '2-digit',
                                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                                            })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded w-full text-xs font-semibold tracking-wide ${getActionColor(log.action)}`}>
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {log.username.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="font-semibold text-slate-700">{log.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 truncate max-w-md">
                                            {log.details || "-"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
