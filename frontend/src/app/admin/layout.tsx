"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLanguage } from "@/contexts/language-context";

type AdminRole = "admin" | "editor";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  const [checkingRole, setCheckingRole] = useState(true);
  const [userRole, setUserRole] = useState<AdminRole | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const isAdmin = userRole === "admin";

  const navLinkClass = (isActive: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border ${
      isActive
        ? "bg-red-50 text-lira-red border-red-100 shadow-sm"
        : "text-gray-600 hover:text-lira-red hover:bg-red-50 border-transparent"
    }`;

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = String(payload.role || "").toLowerCase();

      if (role !== "admin" && role !== "editor") {
        router.replace("/dashboard");
        return;
      }

      setUserRole(role as AdminRole);

      // Editors can only access article moderation area.
      if (
        role === "editor" &&
        (pathname === "/admin" || pathname.startsWith("/admin/members"))
      ) {
        router.replace("/admin/articles");
        return;
      }
    } catch {
      Cookies.remove("token");
      Cookies.remove("role");
      Cookies.remove("auth_provider");
      router.replace("/auth/login");
      return;
    } finally {
      setCheckingRole(false);
    }
  }, [pathname, router]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  if (checkingRole) {
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
          <h2 className="text-base font-bold text-lira-red">
            {userRole === "editor"
              ? t("Editor Console", "Editor Console")
              : t("Admin Console", "Admin Console")}
          </h2>
          <p className="text-xs text-gray-500">
            {t("Sistem Manajerial", "Management System")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100"
            aria-label={t("Buka menu admin", "Open admin menu")}
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
        </div>
      </header>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            onClick={closeMobileNav}
            className="absolute inset-0 bg-black/40"
            aria-label="Tutup menu admin"
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-white border-r border-gray-200 shadow-xl flex flex-col justify-between">
            <div>
              <div className="py-6 px-6 mb-2 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-lira-red">
                    {userRole === "editor"
                      ? t("Editor Console", "Editor Console")
                      : t("Admin Console", "Admin Console")}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("Sistem Manajerial", "Management System")}
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
                {isAdmin && (
                  <>
                    <Link
                      href="/admin"
                      onClick={closeMobileNav}
                      className={navLinkClass(pathname === "/admin")}
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
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Manajemen User
                    </Link>

                    <Link
                      href="/admin/members"
                      onClick={closeMobileNav}
                      className={navLinkClass(
                        pathname === "/admin/members" ||
                          pathname.startsWith("/admin/members/"),
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
                          d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                        />
                      </svg>
                      Antrean KTA
                    </Link>
                  </>
                )}

                <Link
                  href="/admin/articles"
                  onClick={closeMobileNav}
                  className={navLinkClass(
                    pathname === "/admin/articles" ||
                      pathname.startsWith("/admin/articles/"),
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
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  Antrean Berita
                </Link>

                <Link
                  href="/berita"
                  target="_blank"
                  onClick={closeMobileNav}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-gray-400 hover:text-gray-900 border border-transparent mt-8"
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
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  {t("Portal Berita (Publik)", "News Portal (Public)")}
                </Link>
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
                Keluar (Logout)
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex-col justify-between hidden md:flex sticky top-0 h-screen overflow-y-auto shadow-sm">
        <div>
          <div className="py-6 px-6 mb-2 border-b border-gray-100">
            <h2 className="text-xl font-bold font-sans text-lira-red block">
              {userRole === "editor"
                ? t("Editor Console", "Editor Console")
                : t("Admin Console", "Admin Console")}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {t("Sistem Manajerial", "Management System")}
            </p>
            <div className="mt-3">
              <LanguageSwitcher />
            </div>
          </div>

          <nav className="px-4 space-y-2 mt-4">
            {isAdmin && (
              <>
                <Link
                  href="/admin"
                  className={navLinkClass(pathname === "/admin")}
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
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Manajemen User
                </Link>

                <Link
                  href="/admin/members"
                  className={navLinkClass(
                    pathname === "/admin/members" ||
                      pathname.startsWith("/admin/members/"),
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
                      d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                    />
                  </svg>
                  Antrean KTA
                </Link>
              </>
            )}

            <Link
              href="/admin/articles"
              className={navLinkClass(
                pathname === "/admin/articles" ||
                  pathname.startsWith("/admin/articles/"),
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
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                />
              </svg>
              Antrean Berita
            </Link>

            <Link
              href="/berita"
              target="_blank"
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-gray-400 hover:text-gray-900 border border-transparent mt-8"
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
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                />
              </svg>
              {t("Portal Berita (Publik)", "News Portal (Public)")}
            </Link>
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
            Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow w-full md:w-[calc(100%-16rem)] overflow-x-hidden">
        <div className="p-4 md:p-8 w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
