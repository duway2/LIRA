"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import api from "@/lib/axios";
import { resolvePublicAssetUrl } from "@/lib/public-url";
import {
  INDONESIA_PROVINCES,
  INDONESIA_REGIONS,
} from "@/lib/indonesia-regions";

interface Profile {
  id?: number;
  full_name?: string;
  phone?: string;
  city?: string;
  province?: string;
  identity_photo_url?: string;
  bio?: string;
  status?: string;
  member_code?: string;
  profile_photo_url?: string;
  terms_accepted?: boolean;
}

type ProfileForm = {
  full_name: string;
  phone: string;
  city: string;
  province: string;
  terms_accepted: boolean;
  bio: string;
};

const resolveWizardStep = (
  profile: Profile | null,
  form: ProfileForm,
): 1 | 2 | 3 => {
  const stepOneReady =
    Boolean(form.full_name.trim()) &&
    Boolean(form.phone.trim()) &&
    Boolean(form.city.trim()) &&
    Boolean(form.province.trim()) &&
    Boolean(form.terms_accepted);

  if (!profile?.id || !stepOneReady) {
    return 1;
  }

  if (!profile.identity_photo_url) {
    return 2;
  }

  return 3;
};

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [formData, setFormData] = useState<ProfileForm>({
    full_name: "",
    phone: "",
    city: "",
    province: "",
    terms_accepted: false,
    bio: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingIdentity, setUploadingIdentity] = useState(false);

  const extractApiError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      return String(err.response?.data?.error || err.message || fallback);
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/members/profile");
        if (res.data.profile) {
          const profileData: Profile = res.data.profile;
          const nextFormData: ProfileForm = {
            full_name: res.data.profile.full_name || "",
            phone: res.data.profile.phone || "",
            city: res.data.profile.city || "",
            province: res.data.profile.province || "",
            terms_accepted: Boolean(res.data.profile.terms_accepted),
            bio: res.data.profile.bio || "",
          };

          setProfile(profileData);
          setFormData(nextFormData);
          setCurrentStep(resolveWizardStep(profileData, nextFormData));
        }
      } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          Cookies.remove("token");
          router.push("/auth/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const saveProfile = async () => {
    const stepOneReady =
      Boolean(formData.full_name.trim()) &&
      Boolean(formData.phone.trim()) &&
      Boolean(formData.city.trim()) &&
      Boolean(formData.province.trim());

    if (!stepOneReady) {
      alert("Lengkapi nama, nomor handphone, provinsi, dan kota/kabupaten.");
      return false;
    }

    if (!formData.terms_accepted) {
      alert(
        "Anda wajib menyetujui syarat & ketentuan penyimpanan data pribadi.",
      );
      return false;
    }

    setIsSaving(true);
    try {
      const res = await api.put("/members/profile", formData);
      const updatedProfile: Profile = res.data.profile;
      setProfile(updatedProfile);
      alert("Profil berhasil disimpan!");
      return true;
    } catch (err: unknown) {
      alert(
        "Gagal menyimpan profil: " + extractApiError(err, "Terjadi kesalahan."),
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile();
  };

  const handleStepOneContinue = async () => {
    const saved = await saveProfile();
    if (saved) {
      setCurrentStep(2);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "profile" | "identity",
  ) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];

    if (file.size > 5 * 1024 * 1024) {
      alert("Maksimal ukuran file 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    setUploadingAvatar(type === "profile");
    setUploadingIdentity(type === "identity");
    try {
      const res = await api.post("/members/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const uploadedUrl = String(res.data?.url || "");
      if (uploadedUrl) {
        setProfile((prev) => ({
          ...(prev || {}),
          profile_photo_url:
            type === "profile" ? uploadedUrl : prev?.profile_photo_url,
          identity_photo_url:
            type === "identity" ? uploadedUrl : prev?.identity_photo_url,
        }));
      }

      alert(`Berhasil mengunggah dokumen ${type}`);

      if (type === "identity") {
        setCurrentStep(3);
      }
    } catch (err: unknown) {
      alert(
        `Gagal mengunggah dokumen: ${extractApiError(err, "Terjadi kesalahan upload")}`,
      );
    } finally {
      setUploadingAvatar(false);
      setUploadingIdentity(false);
    }
  };

  const selectedProvinceCities = formData.province
    ? INDONESIA_REGIONS[formData.province] || []
    : [];

  const stepOneReady =
    Boolean(profile?.id) &&
    Boolean(formData.full_name.trim()) &&
    Boolean(formData.phone.trim()) &&
    Boolean(formData.city.trim()) &&
    Boolean(formData.province.trim()) &&
    Boolean(formData.terms_accepted);

  const stepTwoReady = Boolean(profile?.identity_photo_url);

  const stepStatuses: Array<{ step: 1 | 2 | 3; label: string; done: boolean }> =
    [
      {
        step: 1,
        label: "Data Diri & Persetujuan",
        done: stepOneReady,
      },
      {
        step: 2,
        label: "Upload KTP",
        done: stepTwoReady,
      },
      {
        step: 3,
        label: "Konfirmasi & Bayar",
        done: stepOneReady && stepTwoReady,
      },
    ];

  const onboardingChecks = useMemo(() => {
    return [
      {
        label: "Nama lengkap sesuai KTP",
        done: Boolean(formData.full_name.trim()),
      },
      {
        label: "Nomor handphone",
        done: Boolean(formData.phone.trim()),
      },
      {
        label: "Provinsi dan kota/kabupaten",
        done: Boolean(formData.province.trim() && formData.city.trim()),
      },
      {
        label: "Upload foto KTP",
        done: Boolean(profile?.identity_photo_url),
      },
      {
        label: "Setuju syarat & ketentuan",
        done: Boolean(formData.terms_accepted),
      },
    ];
  }, [
    formData.city,
    formData.full_name,
    formData.phone,
    formData.province,
    formData.terms_accepted,
    profile?.identity_photo_url,
  ]);

  const onboardingDoneCount = onboardingChecks.filter(
    (item) => item.done,
  ).length;
  const onboardingComplete = onboardingDoneCount === onboardingChecks.length;

  const onProvinceChange = (province: string) => {
    setFormData((prev) => ({
      ...prev,
      province,
      city: "",
    }));
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-lira-red/30 border-t-lira-red rounded-full animate-spin"></div>
      </div>
    );
  }

  const inputClass =
    "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lira-red/30 focus:border-lira-red transition-all font-sans";
  const idCardUrl = profile?.id
    ? resolvePublicAssetUrl(`/uploads/idcards/${profile.id}.pdf`)
    : "#";

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 font-sans">
          Halo,{" "}
          <span className="text-lira-red">
            {profile?.full_name || "Anggota Baru"}
          </span>
          !
        </h1>
        <p className="text-gray-500 mt-2 font-medium">
          Kelola data profil, unduh kartu ID, dan kelola keamanan akun Anda.
        </p>

        <div className="mt-5 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-gray-900">
                Onboarding Wajib Member
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Lengkapi data diri terlebih dulu, lalu lanjutkan pembayaran
                iuran untuk masuk antrean approval admin.
              </p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                onboardingComplete
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
              }`}
            >
              {onboardingDoneCount}/{onboardingChecks.length} selesai
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
            {onboardingChecks.map((check) => (
              <div
                key={check.label}
                className={`text-sm rounded-xl px-3 py-2 border ${
                  check.done
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {check.done ? "✓" : "○"} {check.label}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {stepStatuses.map((stepItem) => {
              const canOpen =
                stepItem.step === 1 ||
                (stepItem.step === 2 && stepOneReady) ||
                (stepItem.step === 3 && stepOneReady && stepTwoReady);

              const active = currentStep === stepItem.step;

              return (
                <button
                  key={stepItem.step}
                  onClick={() => canOpen && setCurrentStep(stepItem.step)}
                  type="button"
                  disabled={!canOpen}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                    active
                      ? "bg-lira-red text-white border-lira-red"
                      : stepItem.done
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-600 border-gray-200"
                  } ${!canOpen ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  Step {stepItem.step}: {stepItem.label}
                </button>
              );
            })}
          </div>

          {onboardingComplete ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/dashboard/payment")}
                className="bg-lira-red hover:bg-lira-red-dark text-white text-sm font-bold px-4 py-2.5 rounded-xl"
              >
                Lanjut ke Pembayaran Iuran
              </button>
              <p className="text-xs text-gray-500">
                Setelah pembayaran sukses, admin akan review. Saat approve,
                invoice dan kartu anggota dikirim ke email Anda.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-red-600 font-medium">
              Anda belum bisa lanjut ke menu lain sebelum seluruh checklist
              onboarding selesai.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Status Card & Avatar */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-lira-red/5 -mr-10 -mt-10 rounded-full blur-2xl"></div>

            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Status Keanggotaan
            </h3>

            <div className="flex items-center gap-3 mb-6">
              <div
                className={`w-3 h-3 rounded-full ${
                  profile?.status === "active"
                    ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]"
                    : profile?.status === "pending"
                      ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                      : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                }`}
              ></div>
              <span className="font-bold uppercase tracking-widest text-sm text-gray-700">
                {profile?.status || "Belum Mengisi Profil"}
              </span>
            </div>

            {profile?.status === "active" ? (
              <a
                href={idCardUrl}
                target="_blank"
                className="w-full bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-lira-red/20 transition flex justify-center items-center gap-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download ID Card PDF
              </a>
            ) : (
              <div className="text-xs text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
                Isi profil Anda secara lengkap dan unggah foto/KTP. Status Anda
                akan direview oleh Administrator sebelum Rekor ID/Barcode
                diterbitkan.
              </div>
            )}
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Foto Profil / Avatar
            </h3>

            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-red-100 mb-4 shadow-lg">
                {profile?.profile_photo_url ? (
                  <img
                    src={resolvePublicAssetUrl(profile.profile_photo_url)}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">
                    👤
                  </div>
                )}
              </div>
              <label className="cursor-pointer bg-gray-900 hover:bg-black px-5 py-2.5 rounded-xl text-sm transition-colors text-white font-bold shadow-md">
                {uploadingAvatar ? "Mengunggah..." : "Unggah Pas Foto"}
                <input
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={(e) => handleFileUpload(e, "profile")}
                  disabled={uploadingAvatar}
                />
              </label>
              <p className="text-xs text-gray-400 mt-3 text-center">
                Format JPG/PNG. Maks 5MB. Digunakan untuk Kartu ID.
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Foto KTP (Wajib)
            </h3>

            {profile?.identity_photo_url ? (
              <div className="mb-4 h-40 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img
                  src={resolvePublicAssetUrl(profile.identity_photo_url)}
                  alt="Foto KTP"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="mb-4 h-40 rounded-xl border border-dashed border-red-300 bg-red-50 text-red-600 text-sm flex items-center justify-center text-center px-4 font-semibold">
                Belum ada foto KTP. Upload wajib sebelum checkout pembayaran.
              </div>
            )}

            <label className="cursor-pointer bg-lira-red hover:bg-lira-red-dark px-5 py-2.5 rounded-xl text-sm transition-colors text-white font-bold shadow-md inline-flex">
              {uploadingIdentity ? "Mengunggah KTP..." : "Unggah Foto KTP"}
              <input
                type="file"
                className="hidden"
                accept="image/png, image/jpeg"
                onChange={(e) => handleFileUpload(e, "identity")}
                disabled={uploadingIdentity}
              />
            </label>
            <p className="text-xs text-gray-400 mt-3">
              Format JPG/PNG. Maks 5MB.
            </p>
          </div>
        </div>

        {/* Kolom Kanan: Wizard Onboarding */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 p-6 sm:p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold mb-2 text-gray-900">
              Wizard Onboarding Member
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Ikuti langkah 1 sampai 3 agar akun siap masuk proses aktivasi.
            </p>

            {currentStep === 1 && (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-lira-red">
                  Step 1: Data Diri & Persetujuan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Nama Lengkap Sesuai KTP
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      className={inputClass}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Nomor Handphone (WhatsApp)
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className={inputClass}
                      placeholder="081234567890"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Provinsi
                    </label>
                    <select
                      required
                      value={formData.province}
                      onChange={(e) => onProvinceChange(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Pilih provinsi</option>
                      {INDONESIA_PROVINCES.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Kota / Kabupaten
                    </label>
                    <select
                      required
                      disabled={!formData.province}
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      className={inputClass}
                    >
                      <option value="">
                        {formData.province
                          ? "Pilih kota/kabupaten"
                          : "Pilih provinsi dulu"}
                      </option>
                      {selectedProvinceCities.map((city) => (
                        <option key={city} value={city}>
                          {city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Bio Singkat / Jabatan (Opsional)
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) =>
                        setFormData({ ...formData, bio: e.target.value })
                      }
                      className={`${inputClass} min-h-[100px]`}
                      placeholder="Ceritakan sedikit latar belakang Anda..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-xl bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.terms_accepted}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            terms_accepted: e.target.checked,
                          })
                        }
                        className="mt-1 h-4 w-4 text-lira-red border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 leading-relaxed">
                        Saya menyetujui syarat & ketentuan penyimpanan data
                        pribadi untuk proses verifikasi keanggotaan LIRA.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3 justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-gray-900 hover:bg-black text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    {isSaving ? "Menyimpan..." : "Simpan Step 1"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStepOneContinue}
                    disabled={isSaving}
                    className="bg-lira-red hover:bg-lira-red-dark text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-lira-red/20 transition-all"
                  >
                    Simpan & Lanjut Step 2
                  </button>
                </div>
              </form>
            )}

            {currentStep === 2 && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-lira-red">
                  Step 2: Upload Dokumen KTP
                </h3>

                {!profile?.id ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 font-medium">
                    Simpan data di Step 1 terlebih dulu agar upload KTP bisa
                    diproses.
                  </div>
                ) : (
                  <>
                    <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        Upload Foto KTP (Wajib)
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Format JPG/PNG, maksimal 5MB.
                      </p>

                      <label className="cursor-pointer inline-flex bg-lira-red hover:bg-lira-red-dark px-5 py-2.5 rounded-xl text-sm transition-colors text-white font-bold shadow-md">
                        {uploadingIdentity
                          ? "Mengunggah KTP..."
                          : "Pilih Foto KTP"}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png, image/jpeg"
                          onChange={(e) => handleFileUpload(e, "identity")}
                          disabled={uploadingIdentity}
                        />
                      </label>

                      {profile?.identity_photo_url && (
                        <p className="text-xs text-green-700 mt-3 font-medium">
                          KTP sudah terunggah dan siap diverifikasi.
                        </p>
                      )}
                    </div>

                    <div className="rounded-xl border border-gray-200 p-4 bg-white">
                      <p className="text-sm font-semibold text-gray-800 mb-2">
                        Upload Pas Foto (Opsional)
                      </p>
                      <p className="text-xs text-gray-500 mb-3">
                        Foto ini dipakai untuk tampilan kartu anggota digital.
                      </p>

                      <label className="cursor-pointer inline-flex bg-gray-900 hover:bg-black px-5 py-2.5 rounded-xl text-sm transition-colors text-white font-bold shadow-md">
                        {uploadingAvatar
                          ? "Mengunggah Foto..."
                          : "Pilih Pas Foto"}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png, image/jpeg"
                          onChange={(e) => handleFileUpload(e, "profile")}
                          disabled={uploadingAvatar}
                        />
                      </label>
                    </div>
                  </>
                )}

                <div className="pt-2 flex flex-wrap gap-3 justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Kembali ke Step 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(3)}
                    disabled={!stepTwoReady}
                    className={`font-bold py-3 px-6 rounded-xl transition-all ${
                      stepTwoReady
                        ? "bg-lira-red hover:bg-lira-red-dark text-white shadow-lg shadow-lira-red/20"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Lanjut ke Step 3
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-lira-red">
                  Step 3: Konfirmasi & Pembayaran
                </h3>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
                  <p>
                    <span className="font-semibold">Nama:</span>{" "}
                    {formData.full_name || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">WhatsApp:</span>{" "}
                    {formData.phone || "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Domisili:</span>{" "}
                    {formData.city && formData.province
                      ? `${formData.city}, ${formData.province}`
                      : "-"}
                  </p>
                  <p>
                    <span className="font-semibold">Status KTP:</span>{" "}
                    {stepTwoReady ? "Sudah terunggah" : "Belum terunggah"}
                  </p>
                </div>

                <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-800 font-medium leading-relaxed">
                  Setelah pembayaran sukses, data Anda akan direview admin. Jika
                  disetujui, invoice dan kartu anggota otomatis dikirim ke
                  email.
                </div>

                <div className="pt-2 flex flex-wrap gap-3 justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(2)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Kembali ke Step 2
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard/payment")}
                    disabled={!onboardingComplete}
                    className={`font-bold py-3 px-6 rounded-xl transition-all ${
                      onboardingComplete
                        ? "bg-lira-red hover:bg-lira-red-dark text-white shadow-lg shadow-lira-red/20"
                        : "bg-gray-200 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Buka Halaman Pembayaran
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
