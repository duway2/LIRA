# LIRA Monolith (Backend Go + Frontend Next.js)

Panduan ini menjelaskan cara menjalankan website LIRA di local environment.

## 1. Arsitektur Singkat

- Backend API: Go (Gin) di `http://127.0.0.1:8080`
- Frontend Web: Next.js di `http://localhost:3000`
- Database: MySQL
- Cache/OTP: Redis

Frontend memanggil API ke `/api/v1`, jadi backend harus menyala agar fitur login, member, artikel, dan payment berjalan.

## 2. Prasyarat

Pastikan sudah terpasang:

- Node.js 20+
- npm 10+
- Go 1.25+
- MySQL 8+
- Redis 6+

## 3. Setup Environment

Di root project, salin file contoh environment:

```powershell
Copy-Item .env.example .env
```

Lalu sesuaikan nilai penting di `.env`:

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- `JWT_SECRET`
- `FRONTEND_URL=http://localhost:3000`
- `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`

Catatan:

- Untuk local, Google OAuth dan Brevo email boleh dikosongkan sementara.
- Backend membaca `.env` relatif dari `backend/cmd/api`, jadi jalankan backend dari folder itu agar config terbaca konsisten.

## 4. Setup Database

1. Buat database MySQL, contoh:

```sql
CREATE DATABASE lira_db;
```

2. Jalankan migration secara berurutan:

- `database/migrations/001_initial_schema.sql`
- `database/migrations/002_add_2fa_to_users.sql`

Contoh (PowerShell):

```powershell
mysql -u root -p lira_db < database/migrations/001_initial_schema.sql
mysql -u root -p lira_db < database/migrations/002_add_2fa_to_users.sql
```

## 5. Jalankan Backend

Di terminal pertama:

```powershell
cd backend/cmd/api
go run .
```

Verifikasi health check:

```powershell
curl http://127.0.0.1:8080/api/v1/health
```

Jika sukses, akan mengembalikan status `ok`.

## 6. Jalankan Frontend

Di terminal kedua:

```powershell
cd frontend
npm install
```

Buat file `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8080/api/v1
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
```

Lalu jalankan:

```powershell
npm run dev
```

Website akan tersedia di:

- `http://localhost:3000`

## 7. Akun dan Alur Dasar Tes

1. Buka `/auth/register` untuk daftar akun.
2. Login lewat `/auth/login`.
3. Lengkapi profil member di `/dashboard`.
4. Coba fitur artikel di `/dashboard/articles`.

## 8. Troubleshooting Cepat

- `Could not connect to database`:
  - cek MySQL menyala dan kredensial `.env`.
- `Redis failed to connect`:
  - fitur OTP/2FA dapat gagal, pastikan Redis aktif.
- Frontend tidak bisa hit API:
  - cek `NEXT_PUBLIC_API_URL` di `frontend/.env.local`.
- CORS error:
  - pastikan `FRONTEND_URL` di `.env` sama dengan origin frontend (`http://localhost:3000`).

## 9. Mode Production (Referensi)

Folder `deploy/` berisi contoh konfigurasi:

- `deploy/nginx.conf`
- `deploy/lira-api.service`
- `deploy/ecosystem.config.js`

Gunakan ini sebagai baseline saat deploy ke VPS.
