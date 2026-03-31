"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

type AdminRole = "admin" | "editor";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingRole, setCheckingRole] = useState(true);
  const [userRole, setUserRole] = useState<AdminRole | null>(null);

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("role");
    router.push("/auth/login");
  };

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
      router.replace("/auth/login");
      return;
    } finally {
      setCheckingRole(false);
    }
  }, [pathname, router]);

  if (checkingRole) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
        <div className="h-10 w-10 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex bg-gray-50">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col justify-between hidden md:flex sticky top-20 h-[calc(100vh-80px)] overflow-y-auto shadow-sm">
        <div>
          <div className="py-6 px-6 mb-2 border-b border-gray-100">
            <h2 className="text-xl font-bold font-sans text-lira-red block">
              {userRole === "editor" ? "Editor Console" : "Admin Console"}
            </h2>
            <p className="text-xs text-gray-500 mt-1">Sistem Manajerial</p>
          </div>

          <nav className="px-4 space-y-2 mt-4">
            {userRole === "admin" && (
              <>
                <Link
                  href="/admin"
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border ${
                    pathname === "/admin"
                      ? "bg-red-50 text-lira-red border-red-100 shadow-sm"
                      : "text-gray-600 hover:text-lira-red hover:bg-red-50 border-transparent"
                  }`}
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border ${
                    pathname === "/admin/members" ||
                    pathname.startsWith("/admin/members/")
                      ? "bg-red-50 text-lira-red border-red-100 shadow-sm"
                      : "text-gray-600 hover:text-lira-red hover:bg-red-50 border-transparent"
                  }`}
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
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm border ${
                pathname === "/admin/articles" ||
                pathname.startsWith("/admin/articles/")
                  ? "bg-red-50 text-lira-red border-red-100 shadow-sm"
                  : "text-gray-600 hover:text-lira-red hover:bg-red-50 border-transparent"
              }`}
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
              Portal Berita (Publik)
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
      <main className="flex-grow w-full md:w-[calc(100%-16rem)] overflow-y-auto">
        <div className="p-4 md:p-8 w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}
