"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";

export default function LayoutFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isDashboardShell =
    pathname.startsWith("/admin") || pathname.startsWith("/dashboard");

  if (isDashboardShell) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />

      <main className="min-h-screen pt-20">{children}</main>

      <footer className="bg-gray-100 py-8 border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-500 font-semibold">
            &copy; {new Date().getFullYear()} LUMBUNG INFORMASI RAKYAT. Hak
            Cipta Dilindungi.
          </p>
          <div className="flex gap-4 text-sm text-gray-500 font-medium">
            <a href="#" className="hover:text-lira-red">
              Kebijakan Privasi
            </a>
            <a href="#" className="hover:text-lira-red">
              Syarat & Ketentuan
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
