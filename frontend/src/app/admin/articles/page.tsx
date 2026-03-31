"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/axios";

interface Article {
  id: number;
  title: string;
  slug: string;
  author_name: string;
  status: string;
  view_count: number;
  created_at: string;
}

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const res = await api.get("/admin/articles");
      setArticles(res.data.articles || []);
    } catch (err) {
      console.error(err);
      alert("Gagal memuat daftar artikel.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (id: number, actionStatus: string) => {
    if (!confirm(`Tandai artikel ini sebagai ${actionStatus.toUpperCase()}?`)) return;
    
    setProcessingId(id);
    try {
      await api.post(`/admin/articles/${id}/review`, { status: actionStatus });
      fetchArticles();
    } catch (err: any) {
      alert("Gagal merubah status artikel: " + (err.response?.data?.error || err.message));
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "published": return <span className="px-3 py-1 text-xs rounded-full bg-green-50 text-green-600 font-bold border border-green-200">PUBLISHED</span>;
      case "review": return <span className="px-3 py-1 text-xs rounded-full bg-blue-50 text-blue-600 font-bold border border-blue-200">PENDING REVIEW</span>;
      case "rejected": return <span className="px-3 py-1 text-xs rounded-full bg-red-50 text-red-600 font-bold border border-red-200">REJECTED</span>;
      default: return <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 font-bold border border-gray-200">DRAFT</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 font-sans">Moderasi Berita LIRA</h1>
          <p className="text-gray-500 mt-2 font-medium">Pusat persetujuan penerbitan artikel jurnalis / opini sipil.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/berita" target="_blank" className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm transition-colors border border-gray-200 shadow-sm">
            Lihat Portal Publik &nearr;
          </Link>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Judul Artikel</th>
                <th className="px-6 py-4">Penulis</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal Masuk</th>
                <th className="px-6 py-4 text-right">Aksi Moderasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-900 line-clamp-2 max-w-xs">{a.title}</div>
                    <Link href={`/berita/${a.slug}`} target="_blank" className="text-xs text-lira-red hover:underline mt-1 inline-block font-bold">Pratinjau Artikel</Link>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-700">{a.author_name}</td>
                  <td className="px-6 py-4">{statusBadge(a.status)}</td>
                  <td className="px-6 py-4 text-gray-500 font-medium">{new Date(a.created_at).toLocaleDateString("id-ID", { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td className="px-6 py-4 text-right">
                    {a.status === "review" && (
                      <div className="flex gap-2 justify-end">
                        <button
                          disabled={processingId === a.id}
                          onClick={() => handleReviewAction(a.id, "published")}
                          className="px-3 py-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-xs font-bold transition-colors border border-green-200 shadow-sm"
                        >
                          Terbitkan
                        </button>
                        <button
                          disabled={processingId === a.id}
                          onClick={() => handleReviewAction(a.id, "rejected")}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors border border-red-200 shadow-sm"
                        >
                          Tolak
                        </button>
                      </div>
                    )}
                    {a.status === "published" && (
                      <button
                        disabled={processingId === a.id}
                        onClick={() => handleReviewAction(a.id, "draft")}
                        className="px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-600 hover:bg-yellow-100 text-xs font-bold transition-colors border border-yellow-200 shadow-sm"
                      >
                        Turunkan ke Draft
                      </button>
                    )}
                    {a.status === "rejected" || a.status === "draft" ? (
                      <span className="text-xs text-gray-400 block pt-1 font-medium">Terkunci (Hak Penulis)</span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {articles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">Belum ada artikel yang masuk ke sistem.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
