"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-red-50 relative overflow-hidden px-4">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-lira-red/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-gray-200 p-8 sm:p-10 rounded-3xl shadow-xl relative z-10">
        
        <Link href="/auth/login" className="inline-block mb-8 text-gray-400 hover:text-gray-900 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </Link>
        
        <h2 className="text-3xl font-black text-gray-900 mb-2 font-sans tracking-tight">Lupa <span className="text-lira-red">Sandi?</span></h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">Masukkan alamat email Anda yang terdaftar pada sistem LIRA. Kami akan mengirimkan tautan untuk mereset kata sandi Anda.</p>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <svg className="w-12 h-12 text-green-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <h3 className="text-green-700 font-bold text-lg mb-2">Tautan Mengudara!</h3>
            <p className="text-green-600 text-sm">Jika email terdaftar, instruksi keamanan telah dikirim ke kotak masuk Anda. Segera periksa.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium">
                {error}
              </div>
            )}
            
            <div>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lira-red/30 focus:border-lira-red transition-all"
                placeholder="Alamat Email Valid"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center shadow-lg shadow-lira-red/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                "Kirim Tautan Reset"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
