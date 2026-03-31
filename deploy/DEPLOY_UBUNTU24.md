# Deploy LIRA ke Ubuntu 24 (Nginx + MySQL + PM2)

Panduan ini untuk deployment production di satu server:

- Backend Go di port 8080
- Frontend Next.js di port 3001
- Reverse proxy Nginx di port 80/443

Contoh path project di dokumen ini memakai:

- APP_ROOT=/var/www/html/lira

## 0. Penting sebelum deploy

Server hanya bisa mengambil commit yang sudah ada di GitHub.
Jika masih ada perubahan lokal yang belum di-push, lakukan commit dan push dulu dari laptop.

## 1. Persiapan server

Jalankan sebagai user dengan sudo.

```bash
sudo apt update
sudo apt install -y git curl ca-certificates unzip redis-server
```

Pastikan service utama aktif:

```bash
sudo systemctl enable --now mysql
sudo systemctl enable --now redis-server
sudo systemctl enable --now nginx
```

## 2. Clone source code

```bash
sudo mkdir -p /var/www/html
cd /var/www/html
sudo git clone https://github.com/duway2/LIRA.git lira
sudo chown -R $USER:$USER /var/www/html/lira
```

## 3. Setup database MySQL

Buat database dan jalankan migration.

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lira_db;"

mysql -u root -p lira_db < /var/www/html/lira/database/migrations/001_initial_schema.sql
mysql -u root -p lira_db < /var/www/html/lira/database/migrations/002_add_2fa_to_users.sql
```

## 4. Konfigurasi environment backend

Buat file environment backend:

```bash
cp /var/www/html/lira/.env.server.example /var/www/html/lira/backend/.env
nano /var/www/html/lira/backend/.env
```

Nilai minimal yang wajib benar:

- DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
- PORT=8080
- JWT_SECRET
- FRONTEND_URL=https://domain-anda.com
- MIDTRANS_SERVER_KEY, MIDTRANS_CLIENT_KEY
- GOOGLE_REDIRECT_URL=https://domain-anda.com/api/v1/auth/google/callback (jika pakai Google SSO)

## 5. Build dan jalankan backend via systemd

Build binary:

```bash
cd /var/www/html/lira/backend
go mod tidy
mkdir -p /var/www/html/lira/backend/bin
go build -o /var/www/html/lira/backend/bin/lira-api ./cmd/api
```

Pasang service:

```bash
sudo cp /var/www/html/lira/deploy/lira-api.service /etc/systemd/system/lira-api.service
sudo nano /etc/systemd/system/lira-api.service
```

Pastikan isinya minimal cocok dengan ini:

```ini
[Unit]
Description=LIRA Backend API Service built with Golang
After=network.target mysql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/html/lira/backend/cmd/api
ExecStart=/var/www/html/lira/backend/bin/lira-api
Restart=on-failure
RestartSec=5
EnvironmentFile=/var/www/html/lira/backend/.env
StandardOutput=journal
StandardError=journal
SyslogIdentifier=lira-api

[Install]
WantedBy=multi-user.target
```

Enable dan start service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lira-api
sudo systemctl status lira-api --no-pager
```

Tes API:

```bash
curl http://127.0.0.1:8080/api/v1/health
```

## 6. Build dan jalankan frontend via PM2

Catatan: Port `3000` di server Anda sudah dipakai aplikasi lain, jadi LIRA dijalankan di port `3001`.

Install dependency dan build:

```bash
cd /var/www/html/lira/frontend
npm ci
```

Buat environment frontend:

```bash
cat > /var/www/html/lira/frontend/.env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://domain-anda.com/api/v1
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxx
EOF
```

Build Next.js:

```bash
npm run build
```

Start PM2:

```bash
cd /var/www/html/lira/deploy
pm2 delete lira-frontend || true
pm2 start ecosystem.config.js --env production
pm2 save
pm2 list
pm2 logs lira-frontend --lines 80
```

Aktifkan auto-start PM2 saat reboot:

```bash
pm2 startup systemd
```

Ikuti command yang keluar dari pm2 startup (biasanya perlu sudo).

## 7. Konfigurasi Nginx

Salin config:

```bash
sudo cp /var/www/html/lira/deploy/nginx.conf /etc/nginx/sites-available/lira
sudo nano /etc/nginx/sites-available/lira
```

Ubah server_name menjadi domain Anda.

Aktifkan site:

```bash
sudo ln -sf /etc/nginx/sites-available/lira /etc/nginx/sites-enabled/lira
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 8. Aktifkan HTTPS (Cloudflare Origin SSL)

Gunakan langkah ini jika domain Anda berada di Cloudflare dan memakai mode proxy.

Catatan keamanan:

- Jangan bagikan private key ke chat/ticket.
- Jika private key pernah terpapar, revoke lalu generate ulang Origin Certificate di Cloudflare sebelum dipakai produksi.

Set mode SSL Cloudflare ke `Full (strict)`.

Simpan certificate dan private key di server:

```bash
sudo mkdir -p /etc/ssl/cloudflare
sudo nano /etc/ssl/cloudflare/lira-indonesia.org.crt
sudo nano /etc/ssl/cloudflare/lira-indonesia.org.key

sudo chown root:root /etc/ssl/cloudflare/lira-indonesia.org.crt /etc/ssl/cloudflare/lira-indonesia.org.key
sudo chmod 644 /etc/ssl/cloudflare/lira-indonesia.org.crt
sudo chmod 600 /etc/ssl/cloudflare/lira-indonesia.org.key
```

Validasi dan reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Alternatif (jika tidak memakai proxy Cloudflare): gunakan Let's Encrypt + certbot.

## 9. Buka firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## 10. Verifikasi akhir

```bash
pm2 list
sudo systemctl status lira-api --no-pager
sudo systemctl status nginx --no-pager
curl -I https://lira-indonesia.org
curl -I https://lira-indonesia.org/api/v1/health
```

## 11. Prosedur update aplikasi

Setiap ada update code:

```bash
cd /var/www/html/lira
git pull origin master

# Backend
cd /var/www/html/lira/backend
go build -o /var/www/html/lira/backend/bin/lira-api ./cmd/api
sudo systemctl restart lira-api

# Frontend
cd /var/www/html/lira/frontend
npm ci
npm run build
pm2 restart lira-frontend
```

## Troubleshooting ringkas

- Backend gagal start:
  - cek log: sudo journalctl -u lira-api -n 200 --no-pager
- Frontend 502 dari Nginx:
  - cek PM2: pm2 logs lira-frontend
  - jika restart count tinggi, jalankan ulang dengan config terbaru:
  - `pm2 delete lira-frontend && pm2 start /var/www/html/lira/deploy/ecosystem.config.js --env production`
  - cek port: `ss -ltnp | grep :3001`
- HTTPS selalu `301` ke URL yang sama (loop):
  - jika header berisi `Server: cloudflare` dan `Location` ke URL yang sama, biasanya Cloudflare masih di mode `Flexible`
  - cek Cloudflare SSL/TLS mode, harus `Full (strict)`, bukan `Flexible`
  - cek Rules/Page Rules di Cloudflare, pastikan tidak ada redirect rule yang mengarah ke URL yang sama
  - verifikasi origin langsung: `curl -kI --resolve lira-indonesia.org:443:127.0.0.1 https://lira-indonesia.org/api/v1/health`
- CORS error:
  - pastikan FRONTEND_URL di backend env sama dengan domain frontend
- OTP/2FA gagal:
  - cek redis: redis-cli ping
