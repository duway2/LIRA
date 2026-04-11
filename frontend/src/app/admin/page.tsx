"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import api from "@/lib/axios";
import {
  resolveAlternateImageAssetUrl,
  resolvePublicAssetUrl,
} from "@/lib/public-url";
import { useLanguage } from "@/contexts/language-context";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  is_2fa_enabled: boolean;
  member_id?: number;
  member_status?: string;
  member_code?: string;
  profile_photo_url?: string;
  identity_photo_url?: string;
}

type EditUserForm = {
  name: string;
  email: string;
  role: "admin" | "editor" | "member";
  is_active: boolean;
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [assetVersion, setAssetVersion] = useState<number>(() => Date.now());
  const [searchTerm, setSearchTerm] = useState("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: "",
    email: "",
    role: "member",
    is_active: true,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const filteredUsers = useMemo(() => {
    const normalizedKeyword = searchTerm.trim().toLowerCase();
    if (!normalizedKeyword) {
      return users;
    }

    return users.filter((user) => {
      return [
        String(user.id),
        user.name || "",
        user.email || "",
        user.role || "",
        user.member_code || "",
        user.member_status || "",
        user.is_active ? "active" : "inactive",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedKeyword);
    });
  }, [searchTerm, users]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/admin/users/");
      setUsers(res.data.users || []);
      setAssetVersion(Date.now());
    } catch (err: unknown) {
      if (
        axios.isAxiosError(err) &&
        (err.response?.status === 401 || err.response?.status === 403)
      ) {
        Cookies.remove("token");
        Cookies.remove("role");
        alert(
          t(
            "Akses ditolak! Anda bukan admin.",
            "Access denied! You are not an admin.",
          ),
        );
        router.push("/dashboard");
      } else {
        setError(t("Gagal memuat data pengguna.", "Failed to load user data."));
      }
    } finally {
      setLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    if (
      !confirm(
        `Apakah Anda yakin ingin ${currentStatus ? "Menonaktifkan" : "Mengaktifkan"} user ini?`,
      )
    )
      return;

    setSubmittingId(userId);
    try {
      await api.post("/admin/users/status", {
        target_user_id: userId,
        is_active: !currentStatus,
      });
      fetchUsers();
    } catch {
      alert(t("Gagal merubah status user.", "Failed to update user status."));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleForceResetPassword = async (userId: number) => {
    const newPassword = prompt(
      "Masukkan password baru untuk user ini (Minimal 6 karakter):",
    );
    if (!newPassword || newPassword.length < 6) {
      if (newPassword !== null) alert("Password minimal 6 karakter!");
      return;
    }

    setSubmittingId(userId);
    try {
      await api.post("/admin/users/reset-password", {
        target_user_id: userId,
        new_password: newPassword,
      });
      alert(t("Password berhasil direset!", "Password reset successfully!"));
    } catch {
      alert(
        t("Gagal mereset password user.", "Failed to reset user password."),
      );
    } finally {
      setSubmittingId(null);
    }
  };

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

  const resolveAssetSrc = (path?: string | null) => {
    const resolved = resolvePublicAssetUrl(path);
    if (!resolved) {
      return "";
    }

    return `${resolved}${resolved.includes("?") ? "&" : "?"}v=${assetVersion}`;
  };

  const handleDownloadMemberFile = (
    path?: string | null,
    defaultName = "dokumen-member",
  ) => {
    if (!path) {
      alert(t("Dokumen belum tersedia.", "Document is not available yet."));
      return;
    }

    const resolved = resolvePublicAssetUrl(path);
    if (!resolved) {
      alert(t("URL dokumen tidak valid.", "Document URL is invalid."));
      return;
    }

    const extensionMatch = path.match(/\.[a-z0-9]+$/i);
    const fileName = `${defaultName}${extensionMatch ? extensionMatch[0] : ""}`;
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

  const openEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      role: (user.role as "admin" | "editor" | "member") || "member",
      is_active: Boolean(user.is_active),
    });
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) {
      return;
    }

    const normalizedName = editForm.name.trim();
    const normalizedEmail = editForm.email.trim();
    if (!normalizedName || !normalizedEmail) {
      alert(t("Nama dan email wajib diisi.", "Name and email are required."));
      return;
    }

    setSavingEdit(true);
    try {
      await api.put("/admin/users/update", {
        target_user_id: editingUser.id,
        name: normalizedName,
        email: normalizedEmail,
        role: editForm.role,
        is_active: editForm.is_active,
      });
      alert(
        t("Data user berhasil diperbarui.", "User data updated successfully."),
      );
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      alert(
        "Gagal memperbarui user: " +
          (axios.isAxiosError(err)
            ? String(err.response?.data?.error || err.message)
            : t("Terjadi kesalahan", "An unexpected error occurred")),
      );
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 font-sans">
          {t("Admin Console", "Admin Console")}
        </h1>
        <p className="text-gray-500 mt-2 font-medium">
          {t(
            "Manajemen User dan Otorisasi LIRA.",
            "LIRA User Management and Authorization.",
          )}
        </p>
      </div>

      <div className="mb-5 rounded-xl bg-white border border-gray-200 p-3 sm:p-4 shadow-sm">
        <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
          {t("Pencarian User", "User Search")}
        </label>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={t(
            "Cari nama, email, role, kode member, atau status...",
            "Search name, email, role, member code, or status...",
          )}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-lira-red/25"
        />
      </div>

      {error ? (
        <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-xl font-medium">
          {error}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 uppercase text-xs font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Nama Lengkap</th>
                  <th className="px-6 py-4">Kontak / Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Dokumen Member</th>
                  <th className="px-6 py-4 text-center">2FA</th>
                  <th className="px-6 py-4 text-center">Status Akses</th>
                  <th className="px-6 py-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">
                      {u.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          u.role === "admin"
                            ? "bg-red-50 text-lira-red border border-red-200"
                            : u.role === "editor"
                              ? "bg-blue-50 text-blue-600 border border-blue-200"
                              : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.member_id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            {u.profile_photo_url ? (
                              <img
                                src={resolveAssetSrc(u.profile_photo_url)}
                                onError={(event) =>
                                  handleImageFallback(
                                    event,
                                    u.profile_photo_url,
                                  )
                                }
                                alt="Foto profil member"
                                className="h-9 w-9 rounded-lg border border-gray-200 bg-gray-100 object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-lg border border-dashed border-gray-300 bg-gray-100 text-[10px] text-gray-400 font-bold flex items-center justify-center">
                                FOTO
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={!u.profile_photo_url}
                              onClick={() =>
                                handleDownloadMemberFile(
                                  u.profile_photo_url,
                                  `member-${u.id}-foto`,
                                )
                              }
                              className="px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Download Foto
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {u.identity_photo_url ? (
                              <img
                                src={resolveAssetSrc(u.identity_photo_url)}
                                onError={(event) =>
                                  handleImageFallback(
                                    event,
                                    u.identity_photo_url,
                                  )
                                }
                                alt="Foto KTP member"
                                className="h-9 w-14 rounded-lg border border-gray-200 bg-gray-100 object-cover"
                              />
                            ) : (
                              <div className="h-9 w-14 rounded-lg border border-dashed border-gray-300 bg-gray-100 text-[10px] text-gray-400 font-bold flex items-center justify-center">
                                KTP
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={!u.identity_photo_url}
                              onClick={() =>
                                handleDownloadMemberFile(
                                  u.identity_photo_url,
                                  `member-${u.id}-ktp`,
                                )
                              }
                              className="px-2.5 py-1 rounded-md text-xs font-semibold border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Download KTP
                            </button>
                          </div>

                          <div className="text-[11px] text-gray-500">
                            {u.member_code || "Kode member belum terbit"}
                            {u.member_status
                              ? ` • ${u.member_status.toUpperCase()}`
                              : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">
                          Bukan akun member
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {u.is_2fa_enabled ? "✅" : "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          u.is_active
                            ? "bg-green-50 text-green-600 border border-green-200"
                            : "bg-red-50 text-red-600 border border-red-200"
                        }`}
                      >
                        {u.is_active ? "AKTIF" : "DIBLOKIR"}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-end">
                      <button
                        disabled={submittingId === u.id}
                        onClick={() => openEditUser(u)}
                        className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-blue-200 shadow-sm"
                      >
                        Edit User
                      </button>
                      <button
                        disabled={submittingId === u.id}
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                          u.is_active
                            ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                            : "bg-green-50 text-green-600 hover:bg-green-100 border border-green-200"
                        }`}
                      >
                        {u.is_active ? "Blokir Akses" : "Pulihkan Akses"}
                      </button>
                      <button
                        disabled={submittingId === u.id}
                        onClick={() => handleForceResetPassword(u.id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold transition border border-gray-200 shadow-sm"
                      >
                        Reset PW
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-gray-400 font-medium"
                    >
                      {searchTerm
                        ? t(
                            "Tidak ada data user yang cocok.",
                            "No matching users found.",
                          )
                        : t("Belum ada user terdaftar.", "No users found.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Edit User</h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                aria-label="Tutup dialog"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Nama
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lira-red/25"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lira-red/25"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                  Role
                </label>
                <select
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      role: e.target.value as EditUserForm["role"],
                    }))
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-lira-red/25"
                >
                  <option value="member">Member</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editForm.is_active}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                User aktif
              </label>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={savingEdit}
                onClick={handleSaveEditUser}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-lira-red text-white hover:bg-lira-red-dark disabled:opacity-50"
              >
                {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
