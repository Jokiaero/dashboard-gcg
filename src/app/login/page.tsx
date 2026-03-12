"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [form, setForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        setLoading(false);
        if (res.ok) {
            router.push("/");
        } else {
            setError(data.error || "Login gagal");
        }
    };

    return (
        <div className="container-scroller">
            <div className="container-fluid page-full-height">
                <div className="row w-100 m-0">
                    <div className="content-wrapper full-page-wrapper d-flex align-items-center auth">
                        <div className="row w-100">
                            <div className="col-lg-4 mx-auto">
                                <div className="auth-form-light text-left p-5">
                                    <div className="brand-logo text-center mb-4">
                                        <img src="/assets/images/logo.png" alt="logo" style={{ height: 60 }} />
                                    </div>
                                    <h4 className="text-center mb-2" style={{ color: "#2b4c3d", fontWeight: 700 }}>
                                        Dashboard GCG
                                    </h4>
                                    <h6 className="font-weight-light text-center mb-4">Masuk ke akun Anda</h6>
                                    {error && (
                                        <div className="alert alert-danger" role="alert">
                                            {error}
                                        </div>
                                    )}
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
                                        <div className="mt-3">
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="btn btn-block btn-lg font-weight-medium auth-form-btn w-100 text-white"
                                                style={{ backgroundColor: "#2b4c3d", borderColor: "#2b4c3d" }}
                                            >
                                                {loading ? "Memuat..." : "MASUK"}
                                            </button>
                                        </div>
                                        <div className="text-center mt-4 font-weight-light">
                                            Belum punya akun?{" "}
                                            <Link href="/register" className="text-primary" style={{ color: "#2b4c3d !important" }}>
                                                Daftar
                                            </Link>
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
