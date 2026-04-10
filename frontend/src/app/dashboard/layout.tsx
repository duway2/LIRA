"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import axios from "axios";
import api from "@/lib/axios";

type MemberProfile = {
  full_name?: string;
  phone?: string;
  city?: string;
  province?: string;
  identity_photo_url?: string;
  terms_accepted?: boolean;
};

const getMissingOnboardingFields = (profile?: MemberProfile | null) => {
  const missing: string[] = [];

  if (!profile?.full_name?.trim()) {
    missing.push("Nama lengkap sesuai KTP");
  }

  if (!profile?.phone?.trim()) {
    missing.push("Nomor handphone");
  }

  if (!profile?.province?.trim()) {
    missing.push("Provinsi");
  }

  if (!profile?.city?.trim()) {
    missing.push("Kota/Kabupaten");
  }

  if (!profile?.identity_photo_url?.trim()) {
    missing.push("Foto KTP");
  }

  if (!profile?.terms_accepted) {
    missing.push("Persetujuan syarat & ketentuan");
  }

  return missing;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [onboardingMissingCount, setOnboardingMissingCount] = useState(6);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isOnboardingComplete = useMemo(
    () => onboardingMissingCount === 0,
    [onboardingMissingCount],
  );

  const handleLogout = () => {
    const provider = Cookies.get("auth_provider");

    Cookies.remove("token");
    Cookies.remove("role");
    Cookies.remove("auth_provider");

    const apiBaseUrl = (
      process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8080/api/v1"
    ).replace(/\/$/, "");

    if (provider === "google") {
      window.location.href = `${apiBaseUrl}/auth/google/logout`;
      return;
    }

    router.push("/auth/login");
  };

  const closeMobileNav = () => {
    setMobileNavOpen(false);
  };

  const navLinkClass = (isActive: boolean, isDisabled = false) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border ${
      isActive
        ? "bg-red-50 text-lira-red border-red-100 shadow-sm"
        : "text-gray-600 hover:text-lira-red hover:bg-red-50 border-transparent"
    } ${isDisabled ? "opacity-50 pointer-events-none" : ""}`;

  useEffect(() => {
    let mounted = true;

    const token = Cookies.get("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    const checkSessionAndOnboarding = async () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role === "admin") {
          router.replace("/admin");
          return;
        }

        if (payload.role === "editor") {
          router.replace("/admin/articles");
          return;
        }
      } catch {
        Cookies.remove("token");
        Cookies.remove("role");
        Cookies.remove("auth_provider");
        router.replace("/auth/login");
        return;
      }

      try {
        const res = await api.get("/members/profile");
        const missing = getMissingOnboardingFields(res.data?.profile);
        if (!mounted) {
          return;
        }

        setOnboardingMissingCount(missing.length);

        if (missing.length > 0 && pathname !== "/dashboard") {
          router.replace("/dashboard");
          return;
        }
      } catch (err: unknown) {
        if (!mounted) {
          return;
        }

        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setOnboardingMissingCount(6);
          if (pathname !== "/dashboard") {
            router.replace("/dashboard");
            return;
          }
        } else if (axios.isAxiosError(err) && err.response?.status === 401) {
          Cookies.remove("token");
          Cookies.remove("role");
          Cookies.remove("auth_provider");
          router.replace("/auth/login");
          return;
        } else {
          setOnboardingMissingCount(6);
          if (pathname !== "/dashboard") {
            router.replace("/dashboard");
            return;
          }
        }
      } finally {
        if (mounted) {
          setCheckingOnboarding(false);
        }
      }
    };

    checkSessionAndOnboarding();

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (checkingOnboarding && pathname !== "/dashboard") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 md:flex">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden">
        <div>
          <h2 className="text-base font-bold text-gray-900">Akun Member</h2>
          <p className="text-xs text-gray-500">Sistem Terintegrasi</p>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
          aria-label="Buka menu dashboard"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            onClick={closeMobileNav}
            className="absolute inset-0 bg-black/40"
            aria-label="Tutup menu dashboard"
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white border-r border-gray-200 shadow-xl flex flex-col justify-between">
            <div>
              <div className="py-6 px-6 mb-2 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Akun Member
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Sistem Terintegrasi
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeMobileNav}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                  aria-label="Tutup menu"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <nav className="px-4 space-y-2 mt-4">
                <Link
                  href="/dashboard"
                  onClick={closeMobileNav}
                  className={navLinkClass(pathname === "/dashboard")}
                >
                  <svg
                    className="w-5 h-5 opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profil & Identitas
                </Link>

                <Link
                  href="/dashboard/articles"
                  onClick={closeMobileNav}
                  aria-disabled={!isOnboardingComplete}
                  className={navLinkClass(
                    pathname === "/dashboard/articles" ||
                      pathname.startsWith("/dashboard/articles/"),
                    !isOnboardingComplete,
                  )}
                >
                  <svg
                    className="w-5 h-5 opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Ruang Redaksi Saja
                </Link>

                <Link
                  href="/dashboard/payment"
                  onClick={closeMobileNav}
                  aria-disabled={!isOnboardingComplete}
                  className={navLinkClass(
                    pathname === "/dashboard/payment",
                    !isOnboardingComplete,
                  )}
                >
                  <svg
                    className="w-5 h-5 opacity-80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Sistem Pembayaran
                </Link>

                {!isOnboardingComplete && !checkingOnboarding && (
                  <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 font-medium leading-relaxed">
                    Selesaikan onboarding di halaman Profil & Identitas sebelum
                    membuka menu lainnya.
                  </div>
                )}
              </nav>
            </div>

            <div className="p-4 border-t border-gray-100">
              <button
                onClick={handleLogout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-semibold transition-colors flex justify-center items-center gap-2 border border-red-100"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Keluar Sistem
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 shadow-sm flex-col justify-between hidden md:flex sticky top-0 h-screen overflow-y-auto">
        <div>
          <div className="py-6 px-6 mb-2 border-b border-gray-100">
            <h2 className="text-xl font-bold font-sans text-gray-900">
              Akun{" "}
              <span className="text-lira-red block font-black">MEMBER</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">Sistem Terintegrasi</p>
          </div>

          <nav className="px-4 space-y-2 mt-4">
            <Link
              href="/dashboard"
              className={navLinkClass(pathname === "/dashboard")}
            >
              <svg
                className="w-5 h-5 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profil & Identitas
            </Link>

            <Link
              href="/dashboard/articles"
              aria-disabled={!isOnboardingComplete}
              className={navLinkClass(
                pathname === "/dashboard/articles" ||
                  pathname.startsWith("/dashboard/articles/"),
                !isOnboardingComplete,
              )}
            >
              <svg
                className="w-5 h-5 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Ruang Redaksi Saja
            </Link>

            <Link
              href="/dashboard/payment"
              aria-disabled={!isOnboardingComplete}
              className={`${navLinkClass(pathname === "/dashboard/payment", !isOnboardingComplete)} mt-4`}
            >
              <svg
                className="w-5 h-5 opacity-80"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Sistem Pembayaran
            </Link>

            {!isOnboardingComplete && !checkingOnboarding && (
              <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3 font-medium leading-relaxed">
                Selesaikan onboarding di halaman Profil & Identitas sebelum
                membuka menu lainnya.
              </div>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={handleLogout}
            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl text-sm font-semibold transition-colors flex justify-center items-center gap-2 border border-red-100"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow w-full md:w-[calc(100%-16rem)] overflow-x-hidden">
        <div className="p-0 md:p-8 w-full">{children}</div>
      </main>
    </div>
  );
}
