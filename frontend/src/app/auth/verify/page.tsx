"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/axios";

function VerifyComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("Token keamanan tidak ditemukan pada URL.");
      setLoading(false);
      return;
    }

    const verifyAccount = async () => {
      try {
        await api.post("/auth/verify-account", { token });
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.error || "Gagal memverifikasi akun. Token kadaluarsa atau tidak valid.");
      } finally {
        setLoading(false);
      }
    };

    verifyAccount();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-red-50 relative overflow-hidden px-4">
      <div className="absolute top-1/4 -right-32 w-96 h-96 bg-lira-red/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-gray-200 p-8 sm:p-10 rounded-3xl shadow-xl relative z-10 text-center">
        
        {loading ? (
          <div className="py-10">
            <div className="w-16 h-16 border-4 border-lira-red/20 border-t-lira-red rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Memverifikasi Akun...</h2>
            <p className="text-sm text-gray-500 font-medium">Mohon tunggu sebentar, kami sedang memvalidasi keamanan pendaftaran Anda.</p>
          </div>
        ) : success ? (
          <div className="py-6">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-green-200">
              <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-3">Akun <span className="text-green-600">Aktif!</span></h2>
            <p className="text-gray-500 mb-8 leading-relaxed font-medium">Selamat! Alamat email Anda telah diverifikasi sukses. Anda sekarang memiliki akses penuh ke platform LIRA.</p>
            
            <Link 
              href="/auth/login"
              className="inline-flex w-full bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3.5 px-4 rounded-xl transition-all justify-center items-center shadow-lg shadow-lira-red/20"
            >
              Lanjutkan ke Halaman Login
            </Link>
          </div>
        ) : (
          <div className="py-6">
             <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-red-200">
              <svg className="w-10 h-10 text-lira-red" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-3 tracking-tight">Verifikasi <span className="text-lira-red">Gagal</span></h2>
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium mb-8">
                {error}
            </div>
            
            <Link 
              href="/auth/register"
              className="inline-flex w-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-900 font-bold py-3.5 px-4 rounded-xl transition-all justify-center items-center"
            >
              Kembali ke Pendaftaran
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AccountVerificationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-2 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div></div>}>
      <VerifyComponent />
    </Suspense>
  )
}
