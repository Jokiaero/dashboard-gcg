"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({ username: "", password: "", confirm: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            setError("Password tidak cocok");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username: form.username, password: form.password }),
            });

            let data: Record<string, any> = {};
            try {
                data = await res.json();
            } catch {
                data = {};
            }

            if (res.ok) {
                router.push("/");
                return;
            }

            setError(data.error || "Registrasi gagal");
        } catch {
            setError("Terjadi gangguan jaringan/server. Coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container-scroller">
            <div className="container-fluid page-full-height">
                <div className="row w-100 m-0">
                    <div className="content-wrapper full-page-wrapper d-flex align-items-center justify-content-center auth" style={{ minHeight: "100vh", paddingTop: 24, paddingBottom: 24 }}>
                        <div className="row w-100 justify-content-center">
                            <div className="col-md-7 col-lg-5 col-xl-4">
                                <div className="auth-form-light text-left p-5" style={{ borderRadius: 16, border: "1px solid #e2e8f0", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.10)" }}>
                                    <div className="brand-logo mb-4 d-flex justify-content-center align-items-center">
                                        <img
                                            src="/assets/images/logo.png"
                                            alt="PT Semen Baturaja"
                                            style={{ height: 60, width: "auto", display: "block" }}
                                        />
                                    </div>
                                    <h4 className="text-center mb-2" style={{ color: "#2b4c3d", fontWeight: 700 }}>Daftar Akun</h4>
                                    <h6 className="font-weight-light text-center mb-4">Buat akun baru</h6>
                                    {error && <div className="alert alert-danger">{error}</div>}
                                    <form className="pt-3" onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label className="text-dark font-weight-medium mb-1">Username</label>
                                            <input
                                                type="text"
                                                className="form-control form-control-lg"
                                                placeholder="Username"
                                                value={form.username}
                                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="text-dark font-weight-medium mb-1">Password</label>
                                            <input
                                                type="password"
                                                className="form-control form-control-lg"
                                                placeholder="Password"
                                                value={form.password}
                                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="text-dark font-weight-medium mb-1">Konfirmasi Password</label>
                                            <input
                                                type="password"
                                                className="form-control form-control-lg"
                                                placeholder="Ulangi password"
                                                value={form.confirm}
                                                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="mt-3">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn btn-block btn-lg font-weight-medium auth-form-btn w-100 text-white"
                                                style={{ backgroundColor: "#2b4c3d", borderColor: "#2b4c3d" }}
                                            >
                                                {loading ? "Mendaftar..." : "DAFTAR"}
                                            </button>
                                        </div>
                                        <div className="text-center mt-4 font-weight-light">
                                            Sudah punya akun?{" "}
                                            <Link href="/login" className="text-primary">Masuk</Link>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
