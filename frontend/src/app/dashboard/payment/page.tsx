"use client";

import { useState } from "react";
import Script from "next/script";
import axios from "axios";
import api from "@/lib/axios";

// Declare Snap global object to satisfy TypeScript
declare global {
  interface Window {
    snap: {
      pay: (
        token: string,
        options: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        },
      ) => void;
    };
  }
}

export default function MembershipPaymentPage() {
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [serverNotice, setServerNotice] = useState("");
  const IURAN_AMOUNT = 250000; // Rp 250.000
  const formattedAnnualFee = new Intl.NumberFormat("id-ID").format(
    IURAN_AMOUNT,
  );

  const extractApiError = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      return String(err.response?.data?.error || err.message || fallback);
    }

    if (err instanceof Error) {
      return err.message;
    }

    return fallback;
  };

  const handlePayment = async () => {
    setLoading(true);
    setServerNotice("");
    setMissingFields([]);
    try {
      const res = await api.post("/payments/checkout");
      const snapToken = res.data.snap_token;

      window.snap.pay(snapToken, {
        onSuccess: function () {
          setServerNotice(
            "Pembayaran berhasil. Data Anda akan direview admin. Setelah disetujui, invoice dan kartu anggota dikirim ke email.",
          );
          alert("Pembayaran berhasil! Menunggu review admin.");
        },
        onPending: function () {
          alert("Menunggu pembayaran Anda diselesaikan.");
        },
        onError: function () {
          alert("Pembayaran gagal. Silakan coba lagi.");
        },
        onClose: function () {
          console.log("Pembayaran ditutup sebelum selesai.");
        },
      });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const payload = err.response?.data as
          | { missing_fields?: string[] }
          | undefined;
        if (payload?.missing_fields && Array.isArray(payload.missing_fields)) {
          setMissingFields(payload.missing_fields);
        }
      }

      alert(
        "Gagal menginisiasi pembayaran: " +
          extractApiError(err, "Terjadi kesalahan saat checkout."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-12">
      {/* Script Snap Midtrans */}
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""}
        strategy="lazyOnload"
      />

      <div className="mb-10 text-center">
        <h1 className="text-3xl lg:text-5xl font-black text-gray-900 uppercase tracking-tight font-sans">
          Iuran <span className="text-lira-red">Keanggotaan</span>
        </h1>
        <p className="text-gray-500 mt-4 max-w-xl mx-auto font-medium">
          Tingkatkan status pendaftaran Profil LIRA Anda menjadi keanggotaan
          penuh (Full Member) untuk mengakses fitur penerbitan artikel
          jurnalistik.
        </p>
        <p className="text-sm text-gray-500 mt-3 max-w-xl mx-auto">
          Setelah pembayaran sukses, status tetap menunggu persetujuan admin.
          Saat disetujui, invoice dan kartu anggota dikirim otomatis ke email
          Anda.
        </p>
      </div>

      {serverNotice && (
        <div className="max-w-md mx-auto mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
          {serverNotice}
        </div>
      )}

      {missingFields.length > 0 && (
        <div className="max-w-md mx-auto mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold mb-2">
            Lengkapi data berikut sebelum pembayaran:
          </p>
          <ul className="space-y-1 list-disc pl-5">
            {missingFields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white border-2 border-gray-200 rounded-3xl p-8 lg:p-12 shadow-lg max-w-md mx-auto relative overflow-hidden group hover:shadow-xl transition-shadow duration-300">
        {/* Decorative flair */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-lira-red/10 rounded-full blur-3xl group-hover:bg-lira-red/15 transition-all duration-700"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 mb-6 flex items-center justify-center text-lira-red shadow-sm">
            <svg
              className="w-8 h-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Member Aktif 1 Tahun
          </h2>
          <div className="text-4xl font-black text-gray-900 tabular-nums tracking-tight">
            Rp {formattedAnnualFee}
          </div>

          <ul className="mt-8 space-y-3 w-full text-sm text-gray-600 font-medium">
            <li className="flex items-center gap-3">
              <span className="text-lira-red font-bold">✔</span> ID Card
              Nasional Resmi
            </li>
            <li className="flex items-center gap-3">
              <span className="text-lira-red font-bold">✔</span> Akses Menulis
              Opini Jurnalistik
            </li>
            <li className="flex items-center gap-3">
              <span className="text-lira-red font-bold">✔</span> Terdata di
              Pusat LIRA
            </li>
            <li className="flex items-center gap-3">
              <span className="text-lira-red font-bold">✔</span> Notifikasi
              Aktivitas Prioritas
            </li>
          </ul>

          <button
            onClick={handlePayment}
            disabled={loading}
            className="mt-10 w-full py-4 rounded-xl bg-lira-red hover:bg-lira-red-dark text-white font-bold tracking-wide transition-all shadow-lg shadow-lira-red/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                Pilih Pembayaran{" "}
                <svg
                  className="w-4 h-4 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </>
            )}
          </button>
          <div className="text-xs text-gray-400 mt-4 flex items-center gap-2 font-medium">
            🛡️ Aman melalui{" "}
            <span className="text-gray-700 font-bold">Midtrans</span>
          </div>
        </div>
      </div>
    </div>
  );
}
