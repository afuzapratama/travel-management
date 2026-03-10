# 📱 WhatsApp Automation — VPS Setup

Setup **Evolution API** + **n8n** + **Nginx** + **SSL** di VPS terpisah untuk mengirim invoice via WhatsApp secara otomatis.

## ✨ Fitur Utama

- **🔄 Rotating Sender** — Round-robin rotasi antar multiple WhatsApp instances
- **🔍 Auto-Discovery** — Instance baru otomatis terdeteksi tanpa config ulang
- **🛡️ Auto-Failover** — Jika 1 instance error/terblokir, otomatis pindah ke instance lain
- **🤖 Auto-Reply** — Otomatis balas pesan masuk dengan pesan bot (skip group & status)
- **📊 Monitoring** — Response API menunjukkan instance mana yang digunakan
- **♾️ Unlimited Instances** — Tambah WA sebanyak-banyaknya, semua otomatis masuk pool

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
├── n8n           (internal) ← Webhook + Rotating Sender Logic
├── Evolution API (internal) ← WhatsApp gateway (multi-instance)
├── PostgreSQL    (internal) ← Database
└── Redis         (internal) ← Cache
    │
    ▼ Round-robin select instance → Send
    │
    ├── 📱 Instance 1 (invoice-sender-1) ← WA Nomor 1
    ├── 📱 Instance 2 (invoice-sender-2) ← WA Nomor 2
    ├── 📱 Instance 3 (invoice-sender-3) ← WA Nomor 3
    └── 📱 ... (tambah sebanyak-banyaknya)
    │
    ▼ WhatsApp message + PDF
    │
Customer's WhatsApp
```

## 🔄 Cara Kerja Rotating Sender

```
Request masuk ke n8n webhook
    │
    ▼ Fetch semua instance dari Evolution API
    │
    ▼ Filter yang connected (status: open)
    │
    ▼ Round-robin: pilih instance berikutnya
    │   (simpan index terakhir via workflow static data)
    │
    ▼ Kirim teks via instance terpilih
    │
    ├─ ✅ Berhasil → Lanjut kirim PDF (jika ada)
    │
    └─ ❌ Gagal → Coba instance berikutnya (failover)
        │
        ├─ ✅ Berhasil → Lanjut kirim PDF
        └─ ❌ Semua gagal → Return error + detail attempts
```

**Contoh rotasi 3 instance:**
| Request ke- | Instance Dipilih | Catatan |
|---|---|---|
| 1 | invoice-sender-1 | Round-robin mulai |
| 2 | invoice-sender-2 | Giliran berikut |
| 3 | invoice-sender-3 | Giliran berikut |
| 4 | invoice-sender-1 | Kembali ke awal |
| 5 | invoice-sender-2 | ... dan seterusnya |

**Contoh failover:**
| Request | Primary | Result | Action |
|---|---|---|---|
| 1 | invoice-sender-1 | ❌ Blocked | Otomatis coba sender-2 → ✅ |
| 2 | invoice-sender-2 | ✅ OK | Langsung berhasil |
| 3 | invoice-sender-3 | ❌ Disconnected | Coba sender-1 → ❌ → coba sender-2 → ✅ |

## Prerequisites

- **VPS** Ubuntu 24 dengan Docker + Docker Compose
- **Domain** gtmgroup.co.id dengan akses ke DNS management
- **Nomor WhatsApp** 1 atau lebih (dedicated, pisah dari WA pribadi)

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
chmod +x setup.sh connect-whatsapp.sh test-send.sh manage-instances.sh
./setup.sh

# 4. Connect WhatsApp instance pertama
./connect-whatsapp.sh invoice-sender-1

# 5. (Opsional) Tambah instance lebih banyak
./connect-whatsapp.sh invoice-sender-2
./connect-whatsapp.sh invoice-sender-3

# 6. Import n8n workflow (lihat bagian n8n di bawah)

# 7. Test kirim pesan (lihat rotasi beraksi!)
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

### 2. Connect WhatsApp (Multi-Instance)

```bash
# Instance pertama (wajib minimal 1)
./connect-whatsapp.sh invoice-sender-1

# Instance tambahan (opsional, untuk rotasi)
./connect-whatsapp.sh invoice-sender-2
./connect-whatsapp.sh invoice-sender-3
```

⚠️ **Setiap instance HARUS pakai nomor WhatsApp BERBEDA!**

Script akan:
- Membuat instance di Evolution API
- Generate QR code
- Simpan QR sebagai `qr-code-<nama>.png`

**Scan QR Code:**
1. Buka WhatsApp di HP (gunakan nomor dedicated)
2. Menu ⋮ → Linked Devices → Link a Device
3. Scan QR code

**Cara lihat QR:**
- Download: `scp user@VPS_IP:~/whatsapp-automation/qr-code-invoice-sender-1.png .`
- Browser: `https://wa.gtmgroup.co.id/manager` (Evolution API Manager)

### 3. Setup n8n Workflows

#### A. Rotating Sender (Kirim Invoice)

1. Buka `https://n8n.gtmgroup.co.id` → login (admin / password dari setup)
2. **Import Workflow:**
   - Workflows → Import from File
   - Upload `n8n-workflow.json`
3. **Update API Key** di kedua Code node:
   - Klik node **"Rotate & Send Text"** → ganti `GANTI_DENGAN_EVOLUTION_API_KEY` dengan API key dari `.env`
   - Klik node **"Kirim PDF"** → ganti juga API key yang sama
4. **Activate Workflow** → toggle ON

#### B. Auto-Reply Bot (Balas Otomatis)

1. **Import Workflow:**
   - Workflows → Import from File
   - Upload `n8n-autoreply-workflow.json`
2. **Update API Key** di Code node:
   - Klik node **"Auto-Reply"** → ganti `GANTI_DENGAN_EVOLUTION_API_KEY` dengan API key dari `.env`
3. **(Opsional) Edit pesan auto-reply** di Code node — ubah variabel `AUTO_REPLY_MESSAGE`
4. **Activate Workflow** → toggle ON

> Webhook auto-reply (`/webhook/whatsapp-autoreply`) otomatis terdaftar di setiap instance saat menjalankan `connect-whatsapp.sh`. Jika instance sudah ada sebelumnya, jalankan ulang `connect-whatsapp.sh <nama>` untuk memasang webhook.

> **Catatan:** Kedua workflow tidak perlu Credential setup — semua logic ada di Code node.
> API key hardcoded di dalam Code node (bukan dari n8n Credentials).

### 4. Cek Pool Status

```bash
./manage-instances.sh
```

Output contoh:
```
  🔄 WhatsApp Instance Pool — Rotation Status

  Total Instances: 3

  ┌─────────────────────────────┬────────────┬──────────────────┐
  │ Instance Name               │ Status     │ Phone            │
  ├─────────────────────────────┼────────────┼──────────────────┤
  │ 🟢 invoice-sender-1        │ Connected  │                  │
  │ 🟢 invoice-sender-2        │ Connected  │                  │
  │ 🔴 invoice-sender-3        │ Offline    │                  │
  └─────────────────────────────┴────────────┴──────────────────┘

  🟢 Aktif di rotasi: 2
  🔴 Offline/disconnect: 1

  ✅ 2 instance aktif — rotasi round-robin berjalan
```

### 5. Test

```bash
./test-send.sh
```

Jalankan beberapa kali untuk melihat rotasi:
```
✅ Berhasil!
📱 Instance digunakan: invoice-sender-1
🔄 Pool aktif: 2 instance (invoice-sender-1, invoice-sender-2)
```

```
✅ Berhasil!
📱 Instance digunakan: invoice-sender-2    ← rotasi!
🔄 Pool aktif: 2 instance (invoice-sender-1, invoice-sender-2)
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

### 6. Update Invoice System

Di project invoice-system, tambahkan ke `.env`:
```
VITE_WHATSAPP_API_URL=https://n8n.gtmgroup.co.id
```

## 🆕 Menambah Instance Baru

Proses sangat mudah — cukup 2 langkah:

```bash
# 1. Buat & connect instance baru
./connect-whatsapp.sh invoice-sender-4

# 2. Scan QR code dengan nomor WA baru
#    (ikuti instruksi di layar)
```

**Selesai!** Instance baru otomatis masuk ke rotation pool. Tidak perlu:
- ❌ Restart n8n
- ❌ Update workflow
- ❌ Edit config apapun

n8n Code node fetch instances dari Evolution API **setiap kali** ada request kirim invoice, jadi instance baru langsung terdeteksi.

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

Response (sukses):
```json
{
  "success": true,
  "message": "WhatsApp terkirim dengan PDF",
  "instanceUsed": "invoice-sender-1",
  "connectedInstances": ["invoice-sender-1", "invoice-sender-2"],
  "totalInstances": 2
}
```

Response (error — semua instance gagal):
```json
{
  "success": false,
  "error": "Semua instance gagal (2 dicoba). Error: invoice-sender-2: blocked",
  "instanceUsed": null,
  "connectedInstances": ["invoice-sender-1", "invoice-sender-2"],
  "totalInstances": 2,
  "attempts": [
    { "instance": "invoice-sender-1", "status": "error", "error": "timeout" },
    { "instance": "invoice-sender-2", "status": "failed", "error": "blocked" }
  ]
}
```

## Instance Management

```bash
# Lihat semua instance & status
./manage-instances.sh

# Tambah instance baru
./connect-whatsapp.sh <nama-instance>

# Restart instance (jika hang)
./manage-instances.sh restart <nama-instance>

# Logout WhatsApp (disconnect tapi instance tetap ada)
./manage-instances.sh logout <nama-instance>

# Hapus instance (remove dari pool)
./manage-instances.sh delete <nama-instance>
```

## Docker Management

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

### Instance WhatsApp disconnected
```bash
# Cek status
./manage-instances.sh

# Re-connect (scan QR lagi)
./connect-whatsapp.sh <nama-instance>
```

### Rotasi tidak bekerja (selalu pakai instance yang sama)
- Pastikan workflow n8n sudah **Active** (toggle ON)
- Pastikan ada minimal 2 instance yang status **open**
- Cek: `./manage-instances.sh`

### n8n Code node error "fetch is not defined"
- Pastikan `NODE_FUNCTION_ALLOW_BUILTIN: "*"` ada di `docker-compose.yml` (section n8n environment)
- Restart n8n: `docker compose restart wa-n8n`

### n8n workflow tidak jalan
- Pastikan workflow sudah **Active** (toggle ON)
- Pastikan API key di kedua Code node sudah benar (bukan placeholder)
- Webhook path harus: `/webhook/whatsapp-invoice`

### Evolution API error
```bash
docker compose logs --tail=50 wa-evolution
docker compose restart evolution-api
```

### SSL gagal / certbot stuck
```bash
docker compose down
rm -f nginx/conf.d/wa.gtmgroup.co.id.conf nginx/conf.d/n8n.gtmgroup.co.id.conf
cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf
docker compose up -d
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
docker compose run --rm certbot renew
docker compose exec nginx nginx -s reload
```

### DNS belum propagate
```bash
dig wa.gtmgroup.co.id +short
dig n8n.gtmgroup.co.id +short
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

## Deploy to VPS

```bash
rsync -avz --delete \
  --exclude='.env' \
  --exclude='nginx/conf.d/default.conf' \
  --exclude='qr-code-*.png' \
  -e "ssh -p <PORT>" \
  vps-setup/ root@<VPS_IP>:~/whatsapp-automation/
```
