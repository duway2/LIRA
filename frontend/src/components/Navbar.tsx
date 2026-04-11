"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/language-context";

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const token = Cookies.get("token");
  let isLoggedIn = false;
  let role = "member";

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      isLoggedIn = true;
      role = String(payload.role || "member");
    } catch {
      isLoggedIn = false;
      role = "member";
    }
  }

  // Hide Navbar completely if within Admin/Dashboard (They have their own sidebar layouts)
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard")) {
    return null;
  }

  return (
    <header className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-lira-red rounded-full flex items-center justify-center font-bold text-white border-2 border-transparent group-hover:border-lira-red-light transition-all shadow-md">
            L
          </div>
          <span className="font-bold text-xl tracking-tight text-gray-900 hidden sm:block">
            LIRA <span className="text-lira-red font-light">INDONESIA</span>
          </span>
        </Link>

        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
          <Link
            href="/"
            className="text-gray-600 hover:text-lira-red transition-colors duration-200 hidden md:block"
          >
            {t("Tentang", "About")}
          </Link>
          <Link
            href="/berita"
            className="text-gray-600 hover:text-lira-red transition-colors duration-200 hidden md:block"
          >
            {t("Berita", "News")}
          </Link>

          <div className="h-4 w-px bg-gray-300 hidden md:block"></div>

          <LanguageSwitcher className="hidden sm:inline-flex" />

          {isLoggedIn ? (
            <Link
              href={role === "admin" ? "/admin" : "/dashboard"}
              className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-full transition-all duration-300 shadow-md flex items-center gap-2 text-xs font-semibold tracking-wide uppercase"
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
                  d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {role === "admin"
                ? t("Admin Console", "Admin Console")
                : t("Dashboard Akun", "Account Dashboard")}
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-gray-800 hover:text-lira-red transition-colors duration-200 font-bold"
              >
                {t("Login", "Login")}
              </Link>
              <Link
                href="/auth/register"
                className="bg-lira-red hover:bg-lira-red-light text-white px-5 py-2.5 rounded-full transition-all duration-300 shadow-lg shadow-lira-red/20 font-semibold uppercase tracking-wide text-xs"
              >
                {t("Gabung Member", "Join as Member")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
