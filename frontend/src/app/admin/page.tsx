"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import api from "@/lib/axios";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  is_2fa_enabled: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users/");
      setUsers(res.data.users || []);
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Akses ditolak! Anda bukan admin.");
        router.push("/dashboard");
      } else {
        setError("Gagal memuat data pengguna.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    if (!confirm(`Apakah Anda yakin ingin ${currentStatus ? 'Menonaktifkan' : 'Mengaktifkan'} user ini?`)) return;
    
    setSubmittingId(userId);
    try {
      await api.post("/admin/users/status", {
        target_user_id: userId,
        is_active: !currentStatus
      });
      fetchUsers();
    } catch (err) {
      alert("Gagal merubah status user.");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleForceResetPassword = async (userId: number) => {
    const newPassword = prompt("Masukkan password baru untuk user ini (Minimal 6 karakter):");
    if (!newPassword || newPassword.length < 6) {
      if (newPassword !== null) alert("Password minimal 6 karakter!");
      return;
    }

    setSubmittingId(userId);
    try {
      await api.post("/admin/users/reset-password", {
        target_user_id: userId,
        new_password: newPassword
      });
      alert("Password berhasil direset!");
    } catch (err) {
      alert("Gagal mereset password user.");
    } finally {
      setSubmittingId(null);
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
        <h1 className="text-3xl font-black text-gray-900 font-sans">Admin Console</h1>
        <p className="text-gray-500 mt-2 font-medium">Manajemen User dan Otorisasi LIRA.</p>
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
                  <th className="px-6 py-4 text-center">2FA</th>
                  <th className="px-6 py-4 text-center">Status Akses</th>
                  <th className="px-6 py-4 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-900">{u.name || "N/A"}</td>
                    <td className="px-6 py-4 text-gray-600">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        u.role === 'admin' ? 'bg-red-50 text-lira-red border border-red-200' : 
                        u.role === 'editor' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                        'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      {u.is_2fa_enabled ? '✅' : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        u.is_active ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {u.is_active ? 'AKTIF' : 'DIBLOKIR'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2 justify-end">
                      <button
                        disabled={submittingId === u.id}
                        onClick={() => handleToggleStatus(u.id, u.is_active)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                          u.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                        }`}
                      >
                        {u.is_active ? 'Blokir Akses' : 'Pulihkan Akses'}
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
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400 font-medium">Belum ada user terdaftar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
