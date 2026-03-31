import Image from "next/image";

export default function Home() {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      {/* Light Background Gradient Ornaments */}
      <div className="absolute top-0 -z-10 w-full h-[80vh] bg-gradient-to-b from-red-50/50 to-white" />
      <div className="absolute right-0 top-0 -z-10 w-1/3 h-1/2 bg-lira-red/5 blur-[150px] rounded-full" />
      <div className="absolute left-0 bottom-0 -z-10 w-1/3 h-1/2 bg-red-800/5 blur-[120px] rounded-full" />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 lg:px-8 py-24 sm:py-32 lg:py-40 flex flex-col items-center justify-center text-center">
        <div className="mb-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-red-50 border border-red-100 text-sm font-bold text-lira-red shadow-sm">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lira-red opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-lira-red"></span>
          </span>
          Rekor MURI Organisasi Sipil Terbesar
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight text-gray-900 max-w-5xl leading-[1.1]">
          LIRA <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-lira-red via-red-600 to-red-800">
            INDONESIA
          </span>
        </h1>

        <p className="mt-8 text-lg sm:text-xl text-gray-600 max-w-3xl font-medium leading-relaxed">
          <strong className="text-gray-900">
            LUMBUNG INFORMASI RAKYAT (LIRA)
          </strong>{" "}
          merupakan organisasi masyarakat sipil dengan jaringan luas di seluruh
          Indonesia. Sejak tahun 2009 LIRA tercatat sebagai organisasi dengan
          cabang terbanyak di Indonesia dan memperoleh{" "}
          <span className="text-lira-red font-bold">Rekor MURI</span>. LIRA
          menggunakan konsep{" "}
          <strong className="text-gray-900">Shadow of Governance</strong> untuk
          mengawal kebijakan publik dan memperjuangkan kepentingan rakyat.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <a
            href="/auth/register"
            className="rounded-full bg-lira-red px-10 py-4 text-base font-bold text-white shadow-xl shadow-lira-red/30 hover:bg-lira-red-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lira-red transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            Daftar Sekarang
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </a>
          <a
            href="/auth/login"
            className="rounded-full bg-white border-2 border-gray-200 px-10 py-4 text-base font-bold text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center shadow-sm"
          >
            Masuk ke Dashboard
          </a>
        </div>
      </section>

      {/* Stats/Information Section */}
      <section className="bg-lira-red w-full border-y border-red-800 relative shadow-2xl">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-black mix-blend-overlay"></div>

        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/20 text-center">
            <div className="p-4 flex flex-col items-center">
              <dt className="text-base leading-7 text-red-100 font-medium tracking-wide">
                Sejak Tahun
              </dt>
              <dd className="order-first text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
                2009
              </dd>
            </div>

            <div className="p-4 flex flex-col items-center pt-8 md:pt-4">
              <dt className="text-base leading-7 text-red-100 font-medium tracking-wide">
                Cabang Seluruh
              </dt>
              <dd className="order-first text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
                Indonesia
              </dd>
            </div>

            <div className="p-4 flex flex-col items-center pt-8 md:pt-4">
              <dt className="text-base leading-7 text-red-100 font-medium tracking-wide">
                ID Digital & Barcode
              </dt>
              <dd className="order-first text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
                Instan
              </dd>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section Placeholder */}
      <section className="py-24 sm:py-32 bg-gray-50 border-t border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-base font-bold leading-7 text-lira-red uppercase tracking-widest">
            Platform Terpadu
          </h2>
          <p className="mt-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            Satu Akses Untuk Semua Fitur
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600 font-medium">
            Daftar, aktivasi, dan langsung gunakan fitur-fitur jurnalisme serta
            manajemen keanggotaan modern yang ditenagai oleh performa mutakhir.
          </p>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6 border border-red-100 group-hover:scale-110 transition-transform">
                <svg
                  className="w-7 h-7 text-lira-red"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                ID Card Digital
              </h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                Download dan cetak Kartu Anggota Digital resmi dengan Barcode
                tersinkronisasi server kapan saja tanpa batasan.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6 border border-red-100 group-hover:scale-110 transition-transform">
                <svg
                  className="w-7 h-7 text-lira-red"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Publikasi Berita
              </h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                Gunakan editor CMS intuitif untuk menulis dan menerbitkan rilis
                berita langsung ke jaringan media dan portal harian LIRA.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-8 hover:shadow-xl transition duration-300 group">
              <div className="h-14 w-14 rounded-2xl bg-red-50 flex items-center justify-center mb-6 border border-red-100 group-hover:scale-110 transition-transform">
                <svg
                  className="w-7 h-7 text-lira-red"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Proteksi Level Militer
              </h3>
              <p className="text-gray-600 leading-relaxed font-medium">
                Platform dilindungi keamanan level *Enterprise* dengan ditenagai
                sistem proteksi dan *Single Sign-On* via Google Identity.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
