"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import api from "@/lib/axios";
import {
  resolveAlternateImageAssetUrl,
  resolvePublicAssetUrl,
} from "@/lib/public-url";

type Member = {
  id: number;
  full_name?: string;
  email?: string;
  member_code?: string;
  profile_photo_url?: string;
  identity_photo_url?: string;
  city?: string;
  province?: string;
  status?: string;
};

export default function AdminMembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [accessDenied, setAccessDenied] = useState("");
  const [assetVersion, setAssetVersion] = useState<number>(() => Date.now());

  const fetchMembers = useCallback(async () => {
    try {
      const res = await api.get("/admin/members");
      setMembers(res.data.members || []);
      setAssetVersion(Date.now());
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        Cookies.remove("token");
        Cookies.remove("role");
        router.replace("/auth/login");
        return;
      }

      if (axios.isAxiosError(err) && err.response?.status === 403) {
        setAccessDenied("Akun Anda tidak memiliki izin melihat antrean KTA.");
        router.replace("/admin/articles");
        return;
      }

      alert(
        "Gagal memuat data anggota: " +
          (axios.isAxiosError(err)
            ? String(err.response?.data?.error || err.message)
            : "Terjadi kesalahan tidak dikenal"),
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.replace("/auth/login");
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const role = String(payload.role || "").toLowerCase();
      if (role !== "admin") {
        setAccessDenied("Halaman antrean KTA hanya untuk role admin.");
        setLoading(false);
        router.replace("/admin/articles");
        return;
      }
    } catch {
      Cookies.remove("token");
      Cookies.remove("role");
      router.replace("/auth/login");
      return;
    }

    fetchMembers();
  }, [fetchMembers, router]);

  const verifyMember = async (
    id: number,
    status: "active" | "rejected",
    options?: { skipPayment?: boolean },
  ) => {
    const skipPayment = Boolean(options?.skipPayment);
    const confirmationMessage =
      status === "active" && skipPayment
        ? "Apakah Anda yakin ingin mengaktifkan member ini TANPA pembayaran? Aksi ini akan melewati validasi pembayaran sukses."
        : `Apakah Anda yakin ingin memberikan status "${status}" pada pendaftar ini?`;

    if (!confirm(confirmationMessage)) return;

    setProcessingId(id);
    try {
      await api.post(`/admin/members/${id}/verify`, {
        status,
        skip_payment: skipPayment,
      });
      fetchMembers();
    } catch (err: unknown) {
      alert(
        "Gagal memperbarui status: " +
          (axios.isAxiosError(err)
            ? String(err.response?.data?.error || err.message)
            : "Error tidak diketahui"),
      );
    } finally {
      setProcessingId(null);
    }
  };

  const resolveAssetSrc = (path?: string | null) => {
    const resolved = resolvePublicAssetUrl(path);
    if (!resolved) {
      return "";
    }

    return `${resolved}${resolved.includes("?") ? "&" : "?"}v=${assetVersion}`;
  };

  const downloadFile = (path?: string | null, fallbackName = "dokumen-member") => {
    if (!path) {
      alert("Dokumen belum tersedia.");
      return;
    }

    const resolved = resolvePublicAssetUrl(path);
    if (!resolved) {
      alert("URL dokumen tidak valid.");
      return;
    }

    const extensionMatch = path.match(/\.[a-z0-9]+$/i);
    const fileName = `${fallbackName}${extensionMatch ? extensionMatch[0] : ""}`;
    const finalUrl = `${resolved}${resolved.includes("?") ? "&" : "?"}download=1&v=${Date.now()}`;

    const a = document.createElement("a");
    a.href = finalUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  if (accessDenied) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
        {accessDenied}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lira-red"></div>
      </div>
    );
  }

  const handleImageFallback = (
    event: React.SyntheticEvent<HTMLImageElement>,
    originalPath?: string | null,
  ) => {
    const img = event.currentTarget;
    const fallbackUrl = resolveAlternateImageAssetUrl(
      originalPath,
      img.currentSrc || img.src,
    );
    if (!fallbackUrl) {
      img.onerror = null;
      return;
    }

    img.src = `${fallbackUrl}${fallbackUrl.includes("?") ? "&" : "?"}v=${assetVersion}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-50 text-green-600 border-green-200";
      case "rejected":
        return "bg-red-50 text-red-600 border-red-200";
      case "pending":
        return "bg-yellow-50 text-yellow-600 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 font-sans tracking-tight mb-2">
            Antrean <span className="text-lira-red">KTA Anggota</span>
          </h1>
          <p className="text-gray-500 font-medium">
            Verifikasi berkas dan identitas pendaftar keanggotaan LIRA.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-8 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200 uppercase text-xs font-bold text-gray-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">ID Anggota / Email</th>
                <th className="px-6 py-4">Berkas & Foto</th>
                <th className="px-6 py-4">Domisili</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {members.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-400 font-medium"
                  >
                    Tidak ada pendaftar keanggotaan saat ini.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const status = member.status ?? "pending";

                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">
                          {member.full_name || "Belum ada Nama"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {member.email || "Email Terkait"}
                        </div>
                        <div className="text-xs text-gray-400 mt-1 font-mono">
                          {member.member_code || "KODE PENDING"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            {member.profile_photo_url ? (
                              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                                <img
                                  src={resolveAssetSrc(member.profile_photo_url)}
                                  onError={(event) =>
                                    handleImageFallback(
                                      event,
                                      member.profile_photo_url,
                                    )
                                  }
                                  alt="P"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 font-bold">
                                Foto
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={!member.profile_photo_url}
                              onClick={() =>
                                downloadFile(
                                  member.profile_photo_url,
                                  `member-${member.id}-foto`,
                                )
                              }
                              className="px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Download Foto
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            {member.identity_photo_url ? (
                              <div className="h-10 w-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 shadow-sm">
                                <img
                                  src={resolveAssetSrc(member.identity_photo_url)}
                                  onError={(event) =>
                                    handleImageFallback(
                                      event,
                                      member.identity_photo_url,
                                    )
                                  }
                                  alt="KTP"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-16 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 font-bold">
                                KTP
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={!member.identity_photo_url}
                              onClick={() =>
                                downloadFile(
                                  member.identity_photo_url,
                                  `member-${member.id}-ktp`,
                                )
                              }
                              className="px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Download KTP
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {member.city || "Kota/-"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {member.province || "Provinsi/-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border capitalize inline-flex items-center gap-1.5 ${getStatusColor(status)}`}
                        >
                          {status === "pending" && (
                            <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                          )}
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {status === "pending" && (
                          <div className="flex flex-wrap gap-2 justify-end">
                            <button
                              onClick={() => verifyMember(member.id, "active")}
                              disabled={processingId === member.id}
                              className="bg-green-50 text-green-600 hover:bg-green-100 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors border border-green-200 shadow-sm"
                            >
                              Tarik KTA
                            </button>
                            <button
                              onClick={() =>
                                verifyMember(member.id, "active", {
                                  skipPayment: true,
                                })
                              }
                              disabled={processingId === member.id}
                              className="bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors border border-amber-200 shadow-sm"
                            >
                              Aktifkan (Skip Bayar)
                            </button>
                            <button
                              onClick={() =>
                                verifyMember(member.id, "rejected")
                              }
                              disabled={processingId === member.id}
                              className="bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg text-sm transition-colors border border-red-200 shadow-sm"
                            >
                              Tolak
                            </button>
                          </div>
                        )}

                        {status === "active" && member.member_code && (
                          <div className="text-sm border border-green-200 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold inline-flex">
                            Kartu Telah Terbit
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
