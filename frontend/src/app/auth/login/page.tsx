"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import api from "@/lib/axios";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA state
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const extractApiError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      return String(err.response?.data?.error || err.message || fallback);
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoToken = params.get("token");
    const ssoRole = params.get("role");

    if (!ssoToken) {
      return;
    }

    Cookies.set("token", ssoToken, { expires: 1 });
    const role = ssoRole || "member";
    Cookies.set("role", role, { expires: 1 });
    Cookies.set("auth_provider", "google", { expires: 1 });

    if (role === "admin") {
      router.replace("/admin");
      return;
    }

    if (role === "editor") {
      router.replace("/admin/articles");
      return;
    }

    router.replace("/dashboard");
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });

      if (res.data.requires_otp) {
        setRequiresOTP(true);
      } else {
        Cookies.set("token", res.data.token, { expires: 1 }); // 1 day
        const role = res.data.user?.role || "member";
        Cookies.set("role", role, { expires: 1 });
        Cookies.set("auth_provider", "password", { expires: 1 });

        if (role === "admin") {
          router.push("/admin");
        } else if (role === "editor") {
          router.push("/admin/articles");
        } else {
          router.push("/dashboard");
        }
      }
    } catch (err: unknown) {
      setError(extractApiError(err, "Kredensial tidak valid"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/2fa/verify", { email, code: otpCode });
      Cookies.set("token", res.data.token, { expires: 1 });
      const role = res.data.user?.role || "member";
      Cookies.set("role", role, { expires: 1 });
      Cookies.set("auth_provider", "password", { expires: 1 });

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "editor") {
        router.push("/admin/articles");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(extractApiError(err, "Kode OTP salah atau tertunda"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4 bg-gradient-to-br from-gray-50 via-white to-red-50">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 -z-10 w-96 h-96 bg-lira-red/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 -z-10 w-96 h-96 bg-red-200/30 blur-[120px] rounded-full" />

      <div className="w-full max-w-md bg-white border border-gray-200 p-8 sm:p-10 rounded-3xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-lira-red rounded-2xl flex items-center justify-center font-bold text-white text-xl mx-auto mb-4 shadow-lg shadow-lira-red/20">
            L
          </div>
          <h2 className="text-3xl font-black text-gray-900">Selamat Datang</h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">
            Masuk ke platform utama anggota LIRA
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {!requiresOTP ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Email Akses
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lira-red/30 focus:border-lira-red transition-all font-sans"
                placeholder="email@lira-indonesia.org"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Password
                </label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs font-bold text-lira-red hover:text-lira-red-dark transition-colors"
                >
                  Lupa Sandi?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lira-red/30 focus:border-lira-red transition-all font-sans"
                placeholder="Kata Sandi"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3.5 px-4 rounded-xl focus:outline-none transition-all shadow-lg shadow-lira-red/20 flex justify-center items-center h-12 mt-2"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Masuk"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-6">
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-2 text-center">
              <p className="text-sm font-medium text-gray-700">
                Langkah verifikasi 2-Faktor. Kode OTP (6 angka) telah dikirimkan
                ke <strong className="text-gray-900">{email}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Kode OTP
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-lira-red/30 transition-all font-sans uppercase"
                placeholder="------"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3.5 px-4 rounded-xl focus:outline-none transition-all shadow-lg shadow-lira-red/20 flex justify-center items-center h-12"
            >
              {loading ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Verifikasi"
              )}
            </button>
          </form>
        )}

        {/* Separator */}
        {!requiresOTP && (
          <>
            <div className="mt-8 relative flex items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">
                atau login dengan
              </span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080/api/v1"}/auth/google/login`}
              className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Google SSO Workspace</span>
            </a>
          </>
        )}

        <p className="mt-8 text-center text-sm text-gray-500 font-medium">
          Belum menjadi member?{" "}
          <a
            href="/auth/register"
            className="font-bold text-lira-red hover:text-lira-red-dark hover:underline transition-colors"
          >
            Daftar Disini
          </a>
        </p>
      </div>
    </div>
  );
}
