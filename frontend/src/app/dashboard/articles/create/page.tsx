"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  List,
  ListOrdered,
  ImageIcon,
} from "lucide-react";
import axios from "axios";
import api from "@/lib/axios";

export default function CreateArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [canSubmit, setCanSubmit] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");

  const extractApiError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      return String(err.response?.data?.error || err.message || fallback);
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension.configure({
        inline: true,
        allowBase64: true,
      }),
    ],
    content: "<p>Mulai menulis berita / laporan jurnalisme Anda di sini...</p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-red sm:prose-base lg:prose-lg xl:prose-xl focus:outline-none min-h-[400px] w-full max-w-none text-gray-900 p-6 leading-relaxed bg-white rounded-b-2xl border border-gray-200 border-t-0",
      },
    },
  });

  useEffect(() => {
    const verifyMemberStatus = async () => {
      try {
        const res = await api.get("/members/profile");
        const status = String(res.data?.profile?.status || "").toLowerCase();

        if (status === "active") {
          setCanSubmit(true);
          setAccessMessage("");
        } else {
          setCanSubmit(false);
          setAccessMessage(
            "Hanya member aktif yang dapat submit artikel. Lengkapi profil dan aktivasi keanggotaan Anda terlebih dahulu.",
          );
        }
      } catch (err: unknown) {
        setCanSubmit(false);
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setAccessMessage(
            "Profil member belum dibuat. Silakan lengkapi profil Anda terlebih dahulu.",
          );
        } else {
          setAccessMessage(
            "Gagal memverifikasi status keanggotaan. Coba beberapa saat lagi.",
          );
        }
      } finally {
        setCheckingAccess(false);
      }
    };

    verifyMemberStatus();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      alert("Gambar maksimal 5MB!");
      return;
    }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await api.post("/articles/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const imageUrl = process.env.NEXT_PUBLIC_API_URL
        ? res.data.file.url.replace("/api/v1", "")
        : `http://127.0.0.1:8080${res.data.file.url}`;

      editor?.chain().focus().setImage({ src: imageUrl }).run();
    } catch (err) {
      console.error(err);
      alert("Gagal mengunggah gambar!");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) {
      alert("Akses ditolak. Hanya member aktif yang dapat submit artikel.");
      return;
    }

    if (!title || !editor?.getHTML()) {
      alert("Judul dan konten tidak boleh kosong.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/articles", {
        title,
        content: editor.getHTML(),
      });
      alert("Artikel berhasil di-submit! Menunggu Review Admin.");
      router.push("/dashboard/articles");
    } catch (err: unknown) {
      alert(
        "Gagal mensubmit artikel: " +
          extractApiError(err, "Terjadi kesalahan saat submit artikel."),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!editor) return null;

  if (checkingAccess) {
    return (
      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-12">
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="h-10 w-10 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10">
        <button
          onClick={() => router.push("/dashboard/articles")}
          className="text-gray-500 hover:text-lira-red text-sm mb-4 flex items-center gap-1 transition-colors font-bold"
        >
          &larr; Kembali
        </button>

        <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
          <h1 className="text-2xl font-black text-gray-900 mb-3">
            Akses Submit Artikel Belum Tersedia
          </h1>
          <p className="text-gray-700 leading-relaxed">{accessMessage}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold text-sm"
            >
              Lengkapi Profil
            </button>
            <button
              onClick={() => router.push("/dashboard/payment")}
              className="bg-lira-red hover:bg-lira-red-dark text-white px-5 py-2.5 rounded-xl font-bold text-sm"
            >
              Aktivasi Membership
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toolbarBtnClass = (active: boolean) =>
    `p-2 rounded-lg transition-colors ${active ? "bg-lira-red text-white shadow-sm" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-500 hover:text-lira-red text-sm mb-4 flex items-center gap-1 transition-colors font-bold"
        >
          &larr; Kembali
        </button>
        <h1 className="text-3xl font-black font-sans text-gray-900">
          Buat Artikel Berita
        </h1>
        <p className="text-gray-600 mt-3 text-sm bg-red-50 border border-red-100 py-3 px-4 rounded-xl inline-block font-medium">
          <span className="font-bold text-lira-red">Harap Diperhatikan:</span>{" "}
          Tulisan yang mengandung opini atau berita ini akan dievaluasi oleh
          Redaksi Pemimpin / Editor Pusat sebelum tayang secara publik di portal
          pembaca anonim.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Judul Artikel Spesifik
          </label>
          <input
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-4 text-xl font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lira-red/30 focus:border-lira-red transition-all font-sans"
            placeholder="Contoh: Bongkar Skandal Dana Desa di Kawasan LIRA Wilayah Timur"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Editor Konten Berita
          </label>

          <div className="bg-gray-50 border border-gray-200 rounded-t-2xl p-2 flex flex-wrap gap-1 items-center">
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={toolbarBtnClass(editor.isActive("bold"))}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={toolbarBtnClass(editor.isActive("italic"))}
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              className={toolbarBtnClass(editor.isActive("strike"))}
            >
              <Strikethrough className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            <button
              type="button"
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className={toolbarBtnClass(
                editor.isActive("heading", { level: 2 }),
              )}
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={toolbarBtnClass(editor.isActive("bulletList"))}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={toolbarBtnClass(editor.isActive("orderedList"))}
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            <div className="w-px h-6 bg-gray-200 mx-1"></div>

            <label className="cursor-pointer p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center gap-2 group transition-colors">
              <ImageIcon className="w-4 h-4 group-hover:text-lira-red" />
              <span className="text-xs font-bold group-hover:text-lira-red">
                Sisipkan Gambar
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/png, image/jpeg, image/webp"
                onChange={handleImageUpload}
              />
            </label>
          </div>

          <EditorContent editor={editor} />
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-lira-red/20 transition-all focus:outline-none flex items-center gap-2"
          >
            {loading ? "Menyimpan Dokumen..." : "Submit Publikasi"}
          </button>
        </div>
      </form>
    </div>
  );
}
