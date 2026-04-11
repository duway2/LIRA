import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import LayoutFrame from "@/components/LayoutFrame";
import { LanguageProvider } from "@/contexts/language-context";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LUMBUNG INFORMASI RAKYAT (LIRA)",
  description:
    "Shadow of Governance - Rumah Aspirasi Rakyat dan Jurnalisme Independen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <body
        className={`${outfit.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <LanguageProvider>
          <LayoutFrame>{children}</LayoutFrame>
        </LanguageProvider>
      </body>
    </html>
  );
}
