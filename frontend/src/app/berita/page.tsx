"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";

interface Article {
  id: number;
  title: string;
  slug: string;
  author_name: string;
  view_count: number;
  published_at: string;
  featured_image_url?: string;
}

export default function PublicArticleListPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    try {
      const res = await api.get("/articles");
      setArticles(res.data.articles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 font-sans uppercase tracking-tight">Kabar <span className="text-lira-red">Rakyat</span></h1>
        <p className="text-gray-500 mt-4 text-lg max-w-2xl mx-auto font-medium">
          Portal jurnalisme independen LIRA. Dapatkan informasi terbaru terkait kebijakan publik, investigasi, dan pantauan aspirasi di seluruh wilayah Indonesia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {articles.map((a) => (
          <Link key={a.id} href={`/berita/${a.slug}`} className="group relative block bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col h-full shadow-sm">
            {/* Image */}
            <div className="w-full h-48 bg-gray-100 relative overflow-hidden">
              {a.featured_image_url ? (
                <img src={`http://127.0.0.1:8080${a.featured_image_url}`} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gradient-to-br from-gray-50 to-red-50">
                  <span className="font-black text-3xl opacity-30">LIRA</span>
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-3 font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-lira-red"></span>
                  Lapor LIRA
                </span>
                <span>{new Date(a.published_at).toLocaleDateString("id-ID")}</span>
              </div>
              
              <h2 className="text-lg font-bold text-gray-900 group-hover:text-lira-red transition-colors mb-4 line-clamp-3 leading-snug">
                {a.title}
              </h2>
              
              <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400">Ditulis oleh</span>
                  <span className="text-sm font-bold text-gray-700">{a.author_name || "Redaksi"}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  {a.view_count}
                </div>
              </div>
            </div>
          </Link>
        ))}

        {articles.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 font-medium">
            Belum ada berita yang diterbitkan saat ini.
          </div>
        )}
      </div>
    </div>
  );
}
