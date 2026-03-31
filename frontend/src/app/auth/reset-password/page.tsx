"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token keamanan tidak ditemukan (Invalid Link).");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (password !== confirmPassword) {
      setError("Kata sandi tidak cocok. Silakan periksa kembali.");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Gagal mereset kata sandi. Token mungkin kadaluarsa.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lira-red/30 focus:border-lira-red transition-all";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-red-50 relative overflow-hidden px-4">
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-lira-red/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-gray-200 p-8 sm:p-10 rounded-3xl shadow-xl relative z-10">
        <h2 className="text-3xl font-black text-gray-900 mb-2 font-sans tracking-tight">Kunci <span className="text-lira-red">Baru</span></h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">Buat kata sandi baru untuk mengamankan kembali akses ke dalam sistem LIRA.</p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-green-700 font-bold text-lg mb-2">Terhubung Kembali!</h3>
            <p className="text-green-600 text-sm font-medium">Kata sandi berhasil diperbarui. Mengalihkan Anda ke halaman login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kata Sandi Baru</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Kata Sandi Baru"
                required
                minLength={6}
                disabled={!token}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Konfirmasi Kata Sandi</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Konfirmasi Kata Sandi"
                required
                minLength={6}
                disabled={!token}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !token}
              className="w-full bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-lira-red/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Perbarui Sandi"
              )}
            </button>
            
            <div className="text-center mt-4 pt-4 border-t border-gray-100">
              <Link href="/auth/login" className="text-sm font-bold text-gray-500 hover:text-lira-red transition-colors">
                Batal & Kembali ke Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-2 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
