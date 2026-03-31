"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";

interface Article {
  id: number;
  title: string;
  slug: string;
  status: string;
  view_count: number;
  created_at: string;
  published_at?: string;
}

export default function MyArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await api.get("/me/articles");
      setArticles(res.data.articles || []);
    } catch (err) {
      console.error("Failed to load articles", err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "published": return <span className="px-3 py-1 text-xs rounded-full bg-green-50 text-green-600 font-bold border border-green-200">Diterbitkan</span>;
      case "review": return <span className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-200">Menunggu Review Admin</span>;
      case "rejected": return <span className="px-3 py-1 text-xs rounded-full bg-red-50 text-red-600 font-bold border border-red-200">Ditolak</span>;
      default: return <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 font-bold border border-gray-200">Draft</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 font-sans">Artikel Saya</h1>
          <p className="text-gray-500 mt-1 text-sm font-medium">Kelola publikasi berita, opini, dan draf tulisan Anda.</p>
        </div>
        <Link 
          href="/dashboard/articles/create"
          className="bg-lira-red hover:bg-lira-red-dark text-white px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm font-bold transition-all shadow-lg shadow-lira-red/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Tulis Berita Baru
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Judul Artikel</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Dibaca</th>
                <th className="px-6 py-4">Dibuat Pada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-gray-900 max-w-sm truncate" title={a.title}>
                    <Link href={`/berita/${a.slug}`} className="hover:text-lira-red transition-colors underline-offset-2 hover:underline">
                      {a.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">{statusBadge(a.status)}</td>
                  <td className="px-6 py-4 text-center text-gray-600 font-medium">{a.view_count}x</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{new Date(a.created_at).toLocaleDateString("id-ID")}</td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                    <div className="mb-2 font-medium">Anda belum menulis artikel apapun.</div>
                    <Link href="/dashboard/articles/create" className="text-lira-red hover:underline text-sm font-bold">Mulai Menulis Pertama Anda</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
