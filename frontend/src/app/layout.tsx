import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Navbar from "@/components/Navbar";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUMBUNG INFORMASI RAKYAT (LIRA)",
  description: "Shadow of Governance - Rumah Aspirasi Rakyat dan Jurnalisme Independen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body className={`${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}>
        <Navbar />

        <main className="flex-grow pt-20">
          {children}
        </main>

        <footer className="bg-gray-100 py-8 border-t border-gray-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500 font-semibold">
              &copy; {new Date().getFullYear()} LUMBUNG INFORMASI RAKYAT. Hak Cipta Dilindungi.
            </p>
            <div className="flex gap-4 text-sm text-gray-500 font-medium">
              <a href="#" className="hover:text-lira-red">Kebijakan Privasi</a>
              <a href="#" className="hover:text-lira-red">Syarat & Ketentuan</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
