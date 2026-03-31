# LIRA: Current Flow and Feature Gap

Dokumen ini merangkum alur aplikasi saat ini dan gap terhadap requirement produk yang sudah Anda tetapkan.

## 1) Alur Sistem Saat Ini

### A. Akses dan Routing

- Frontend Next.js melayani halaman publik, auth, dashboard member, dan admin.
- Backend Go (Gin) melayani API `/api/v1`.
- Nginx (deploy) me-reverse-proxy ke frontend dan backend.

### B. Auth

- Register, login JWT, OTP 2FA email, forgot/reset password, verify account.
- Google login callback sudah ada (SSO dasar).

### C. Membership

- Member bisa isi profil, upload dokumen (foto/KTP), admin verifikasi status.
- Status member: pending/active/rejected.
- Generate kartu anggota digital (PDF + QR) sudah ada.

### D. Artikel

- Public list + detail artikel.
- Member bisa submit artikel (masuk review), admin/editor bisa approve/reject.

### E. Payment

- Checkout via Midtrans Snap token.
- Webhook Midtrans update status pembayaran.

### F. Admin

- Kelola user, ubah status user, reset password user.
- Kelola antrean member.
- Moderasi artikel.

## 2) Kecocokan Requirement vs Kondisi Saat Ini

## Sudah ada

- Membership workflow dasar (register, profil, verifikasi admin).
- Midtrans checkout + webhook basic.
- Kartu anggota digital dengan QR.
- Admin reset password user.
- OTP login 2FA via email.

## Sebagian / perlu disempurnakan

- SSO Google + tautkan akun existing: basic sudah ada, UI/linking flow belum lengkap.
- Notifikasi email: sebagian ada, sebagian event belum lengkap/terstandar.
- SEO: metadata artikel ada, tetapi otomasi SEO penuh belum lengkap.
- Dashboard analytics: masih basic, belum sesuai KPI produk.

## Belum ada / belum final

- Rule "hanya member aktif yang boleh submit artikel" (perlu enforce status member).
- Iuran final Rp250.000/tahun (saat ini flow nominal masih perlu disejajarkan).
- Download invoice pembayaran + kirim invoice ke email.
- Reminder expiry 30 hari dan 7 hari sebelum expired (scheduler/cron).
- Anti brute-force/rate limiting untuk auth endpoint.
- Audit log sistem yang rapi (aksi admin, auth event, perubahan data).
- Role Super Admin yang terpisah dari Admin.
- Manajemen kategori dari admin panel (CRUD kategori lengkap).
- Content scheduling publikasi artikel.
- Export laporan CSV/PDF.
- Multimedia lengkap (video embed, podcast, galeri foto, infografis) yang matang.
- AMP (perlu evaluasi karena stack modern Next.js umumnya tidak lagi mengutamakan AMP).

## 3) Error/Bottleneck yang Sudah Teridentifikasi

### Lokal

- Backend gagal start jika port 8080 sudah dipakai proses lain.
- Frontend `npm run dev` gagal jika server Next.js lain masih aktif di project yang sama.

### Server

- PM2 sempat crash-loop karena konflik port 3000 (dipakai app lain), dipindahkan ke 3001.
- Nginx perlu konsisten ke port frontend 3001.
- Cloudflare bisa memicu redirect loop jika mode SSL/TLS bukan `Full (strict)`.

## 4) Prioritas Implementasi (Disarankan)

### Phase 0: Stabilize (langsung)

1. Finalisasi env local/server.
2. Pastikan backend, frontend, nginx, pm2 sehat.
3. Finalisasi SSL Cloudflare origin + Full (strict).

### Phase 1: Security Core

1. Rate limiting auth endpoint (login/register/forgot/otp).
2. Signature verification Midtrans webhook.
3. OAuth state validation untuk Google login.
4. Audit log dasar admin + auth event.

### Phase 2: Membership and Billing Completion

1. Enforce active-member-only submit artikel.
2. Samakan iuran ke Rp250.000/tahun.
3. Invoice generation + download + email invoice.
4. Reminder expiry (30/7 hari) via scheduler.

### Phase 3: CMS and Admin Expansion

1. CRUD kategori di admin panel.
2. Content scheduling.
3. Dashboard analytics + export CSV/PDF.

### Phase 4: SEO and Content UX

1. Sitemap/robots otomatis.
2. Structured data artikel yang lengkap.
3. Social meta yang konsisten.
4. Multimedia enhancement (video/podcast/galeri/infografis).

## 5) Next Step Teknis yang Paling Aman Dimulai

Mulai dari fitur kecil tapi high-impact:

1. Enforce hanya member `active` yang bisa submit artikel.
2. Ubah nominal iuran ke Rp250.000 secara konsisten (frontend + backend).
3. Tambahkan endpoint list invoice pembayaran untuk member dashboard.
