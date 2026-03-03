# 📱 WhatsApp Automation — VPS Setup

Setup **Evolution API** + **n8n** + **Nginx** + **SSL** di VPS terpisah untuk mengirim invoice via WhatsApp secara otomatis.

## Subdomains

| Subdomain | Service | Fungsi |
|---|---|---|
| `wa.gtmgroup.co.id` | Evolution API | WhatsApp gateway (Baileys) |
| `n8n.gtmgroup.co.id` | n8n | Workflow automation + webhook |

## Architecture

```
Invoice App (localhost / production)
    │
    ▼ POST https://n8n.gtmgroup.co.id/webhook/whatsapp-invoice
    │
VPS (Ubuntu 24 + Docker)
├── Nginx         :80/:443  ← Reverse proxy + SSL (Let's Encrypt)
├── n8n           (internal) ← Webhook receiver + orchestrator
├── Evolution API (internal) ← WhatsApp gateway (Baileys)
├── PostgreSQL    (internal) ← Database
└── Redis         (internal) ← Cache
    │
    ▼ WhatsApp message + PDF
    │
Customer's WhatsApp
```

## Prerequisites

- **VPS** Ubuntu 24 dengan Docker + Docker Compose
- **Domain** gtmgroup.co.id dengan akses ke DNS management
- **Nomor WhatsApp** dedicated (untuk bot, pisah dari WA pribadi)

## DNS Setup (WAJIB sebelum jalankan setup)

Di DNS provider domain `gtmgroup.co.id`, tambahkan 2 A record:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `wa` | `<VPS_IP>` | 300 |
| A | `n8n` | `<VPS_IP>` | 300 |

Tunggu 5-10 menit sampai DNS propagate. Verifikasi:
```bash
dig wa.gtmgroup.co.id +short
dig n8n.gtmgroup.co.id +short
# Harus muncul IP VPS kamu
```

## Quick Start

```bash
# 1. Copy folder ini ke VPS
scp -r vps-setup/ user@VPS_IP:~/whatsapp-automation/

# 2. SSH ke VPS
ssh user@VPS_IP
cd ~/whatsapp-automation

# 3. Jalankan setup (auto: generate secrets, SSL, start semua)
chmod +x setup.sh connect-whatsapp.sh test-send.sh
./setup.sh

# 4. Connect WhatsApp (scan QR)
./connect-whatsapp.sh

# 5. Setup n8n workflow (lihat bagian n8n di bawah)

# 6. Test kirim pesan
./test-send.sh
```

## Step-by-Step

### 1. Setup & Start Services

```bash
./setup.sh
```

Script ini akan:
- Generate `.env` dengan credentials random
- Check DNS records untuk kedua subdomain
- Buka firewall ports (80, 443)
- Start Nginx HTTP-only mode (supaya certbot bisa verifikasi)
- Pull Docker images & start semua services
- Request SSL certificates (Let's Encrypt) otomatis
- Switch ke HTTPS Nginx config
- Jika SSL gagal → tetap jalan di HTTP, jalankan `./setup-ssl.sh` nanti

### 2. Connect WhatsApp

```bash
./connect-whatsapp.sh
```

Script ini akan:
- Membuat instance `invoice-bot` di Evolution API
- Generate QR code
- Simpan QR sebagai `qr-code.png`

**Scan QR Code:**
1. Buka WhatsApp di HP (gunakan nomor dedicated)
2. Menu ⋮ → Linked Devices → Link a Device
3. Scan QR code

**Cara lihat QR:**
- Download: `scp user@VPS_IP:~/whatsapp-automation/qr-code.png .`
- Browser: `https://wa.gtmgroup.co.id/manager` (Evolution API Manager)

### 3. Setup n8n Workflow

1. Buka `https://n8n.gtmgroup.co.id` → login (admin / password dari setup)
2. **Create Credential** dulu:
   - Settings → Credentials → Add Credential
   - Type: **Header Auth**
   - Name: `Evolution API Key`
   - Header Name: `apikey`
   - Header Value: `<EVOLUTION_API_KEY dari .env>`
3. **Import Workflow:**
   - Workflows → Import from File
   - Upload `n8n-workflow.json`
4. **Set Environment Variables** di n8n:
   - Settings → Variables, tambahkan:
     - `EVOLUTION_API_URL` = `http://evolution-api:8080`
     - `EVOLUTION_INSTANCE` = `invoice-bot`
5. **Activate Workflow** → toggle ON
6. **Update Credentials** di setiap HTTP Request node:
   - Klik node "Send Text Message" → Credential → pilih "Evolution API Key"
   - Klik node "Send PDF Document" → Credential → pilih "Evolution API Key"

### 4. Test

```bash
./test-send.sh
```

Atau via curl:
```bash
curl -X POST https://n8n.gtmgroup.co.id/webhook/whatsapp-invoice \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "6281234567890",
    "message": "Test message dari invoice system",
    "pdfBase64": "",
    "fileName": ""
  }'
```

### 5. Update Invoice System

Di project invoice-system, tambahkan ke `.env`:
```
VITE_WHATSAPP_API_URL=https://n8n.gtmgroup.co.id
```

## Webhook API Spec

### POST `/webhook/whatsapp-invoice`

Request body:
```json
{
  "phone": "6281234567890",
  "message": "*INVOICE — PT Global Teknik Multi Guna*\n\n📄 No. Invoice: INV/20260301/001\n...",
  "pdfBase64": "JVBERi0xLjQK...",
  "fileName": "Invoice_INV_20260301_001.pdf"
}
```

Response:
```json
{
  "success": true,
  "message": "WhatsApp sent with PDF"
}
```

## Management

```bash
# Lihat status
docker compose ps

# Lihat logs
docker compose logs -f           # semua
docker compose logs -f wa-n8n    # n8n saja
docker compose logs -f wa-evolution  # evolution saja

# Restart
docker compose restart

# Stop semua
docker compose down

# Update images
docker compose pull && docker compose up -d

# Hapus semua data (HATI-HATI!)
docker compose down -v
```

## Troubleshooting

### WhatsApp disconnected
```bash
./connect-whatsapp.sh   # scan QR lagi
```

### n8n workflow tidak jalan
- Pastikan workflow sudah **Active** (toggle ON)
- Cek credential "Evolution API Key" sudah benar
- Cek environment variables di n8n Settings

### Evolution API error
```bash
docker compose logs --tail=50 wa-evolution
# Restart jika perlu
docker compose restart evolution-api
```

### SSL gagal / certbot stuck
```bash
# Ctrl+C jika certbot masih stuck
# Stop semua dulu
docker compose down

# Reset Nginx ke HTTP-only
rm -f nginx/conf.d/wa.gtmgroup.co.id.conf nginx/conf.d/n8n.gtmgroup.co.id.conf
cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf

# Start ulang
docker compose up -d

# Retry SSL
./setup-ssl.sh
```

### Chrome "Dangerous site" warning
Ini Google Safe Browsing, bukan masalah SSL. Domain baru kadang di-flag.
- Klik **Details** → **visit this unsafe site** untuk bypass
- Atau submit review di: https://safebrowsing.google.com/safebrowsing/report_error/
- Biasanya hilang sendiri dalam beberapa hari

### SSL gagal / certbot stuck
```bash
# Ctrl+C jika certbot masih stuck
# Stop semua dulu
docker compose down

# Reset Nginx ke HTTP-only
rm -f nginx/conf.d/wa.gtmgroup.co.id.conf nginx/conf.d/n8n.gtmgroup.co.id.conf
cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf

# Start ulang
docker compose up -d

# Retry SSL
./setup-ssl.sh
```

### Chrome "Dangerous site" warning
Ini Google Safe Browsing, bukan masalah SSL. Domain baru kadang di-flag.
- Klik **Details** → **visit this unsafe site** untuk bypass
- Atau submit review di: https://safebrowsing.google.com/safebrowsing/report_error/
- Biasanya hilang sendiri dalam beberapa hari

### Port tidak bisa diakses
```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### SSL certificate expired
```bash
# Manual renew
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### DNS belum propagate
```bash
dig wa.gtmgroup.co.id +short   # harus muncul IP VPS
dig n8n.gtmgroup.co.id +short  # harus muncul IP VPS
# Jika belum, tunggu 5-10 menit atau cek DNS provider
```

## SSL Auto-Renewal

Container `certbot` otomatis renew certificate setiap 12 jam. Sertifikat Let's Encrypt valid 90 hari.

## Security Notes

✅ Sudah termasuk:
- HTTPS + SSL (Let's Encrypt) untuk semua subdomain
- Nginx reverse proxy (port internal tidak exposed)
- HSTS headers
- HTTP → HTTPS redirect otomatis

⚠️ Pertimbangkan tambahan:
- Batasi akses webhook n8n dengan API key
- Backup Docker volumes secara berkala
- Monitor disk space (WhatsApp media bisa besar)
