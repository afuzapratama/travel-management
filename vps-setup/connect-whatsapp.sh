#!/bin/bash
# ============================================
# CONNECT WHATSAPP — Multi-Instance Support
# Creates & connects a WhatsApp instance
#
# Usage:
#   ./connect-whatsapp.sh                  # default: invoice-sender-1
#   ./connect-whatsapp.sh invoice-sender-2 # custom name
#   ./connect-whatsapp.sh wa-cadangan      # any name you want
#
# Instance baru otomatis masuk ke rotation pool
# n8n akan auto-detect saat mengirim invoice
# ============================================

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DOMAIN="${DOMAIN:-gtmgroup.co.id}"
EVO_DOMAIN="${EVOLUTION_SUBDOMAIN:-wa}.${DOMAIN}"
N8N_DOMAIN="${N8N_SUBDOMAIN:-n8n}.${DOMAIN}"
EVO_KEY="${EVOLUTION_API_KEY:-evo_api_key_change_me}"
INSTANCE="${1:-invoice-sender-1}"

# Auto-detect HTTPS or HTTP
if curl -sk --max-time 3 "https://$EVO_DOMAIN" >/dev/null 2>&1; then
    EVO_URL="https://$EVO_DOMAIN"
else
    EVO_URL="http://$EVO_DOMAIN"
fi

echo ""
echo "============================================"
echo "  📱 WhatsApp Connection Setup"
echo "============================================"
echo ""
echo "Evolution API: $EVO_URL"
echo "Instance: $INSTANCE"
echo ""

# ---------- 1. Show existing instances ----------
echo "🔍 Checking existing instances..."
INSTANCES=$(curl -s "$EVO_URL/instance/fetchInstances" \
  -H "apikey: $EVO_KEY" 2>/dev/null || echo "error")

if echo "$INSTANCES" | grep -q "error\|ECONNREFUSED\|Failed to connect"; then
    echo "❌ Evolution API belum ready."
    echo ""
    echo "   Coba akses manual: curl -s http://$EVO_DOMAIN"
    echo "   Docker status: docker compose ps"
    echo "   Docker logs:   docker compose logs wa-evolution --tail=20"
    exit 1
fi

# Show instance summary
echo ""
echo "📋 Instance yang sudah ada:"
echo "$INSTANCES" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if isinstance(data, list):
        for inst in data:
            name = inst.get('instance', {}).get('instanceName', '?')
            status = inst.get('instance', {}).get('status', '?')
            icon = '🟢' if status == 'open' else '🔴' if status == 'close' else '🟡'
            print(f'   {icon} {name} — {status}')
        if len(data) == 0:
            print('   (belum ada instance)')
    else:
        print('   (format tidak dikenal)')
except Exception as e:
    print(f'   Error parsing: {e}')
" 2>/dev/null || echo "   (gagal parse instance list)"
echo ""

# ---------- 2. Create instance if not exists ----------
if echo "$INSTANCES" | grep -q "\"$INSTANCE\""; then
    echo "✅ Instance '$INSTANCE' sudah ada"
else
    echo "📝 Membuat instance '$INSTANCE'..."

    # Detect WARP proxy
    PROXY_JSON=""
    if curl -s --proxy socks5h://127.0.0.1:40000 --max-time 5 -o /dev/null https://web.whatsapp.com 2>/dev/null; then
        echo "   🌐 WARP proxy detected, adding SOCKS5 proxy config..."
        PROXY_JSON='"proxy": {"host": "127.0.0.1", "port": "40000", "protocol": "socks5", "username": "", "password": ""},'
    fi

    CREATE_RESULT=$(curl -s -X POST "$EVO_URL/instance/create" \
      -H "apikey: $EVO_KEY" \
      -H "Content-Type: application/json" \
      -d "{
        \"instanceName\": \"$INSTANCE\",
        \"integration\": \"WHATSAPP-BAILEYS\",
        \"qrcode\": true,
        $PROXY_JSON
        \"rejectCall\": true,
        \"msgCall\": \"Maaf, nomor ini hanya untuk pengiriman invoice otomatis.\",
        \"groupsIgnore\": true,
        \"alwaysOnline\": true,
        \"readMessages\": false,
        \"readStatus\": false
      }")

    if echo "$CREATE_RESULT" | grep -q "error"; then
        echo "❌ Gagal membuat instance:"
        echo "$CREATE_RESULT" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESULT"
        exit 1
    fi

    echo "✅ Instance '$INSTANCE' berhasil dibuat"
fi

# ---------- 2b. Setup Webhook (auto-reply) ----------
echo ""
echo "🔗 Setting up webhook (auto-reply)..."

# n8n webhook URL — pakai localhost:5678 karena Evolution API di host network
# HTTPS domain tidak bisa dipakai karena proxychains route traffic via WARP
N8N_WEBHOOK="http://127.0.0.1:5678/webhook/whatsapp-autoreply"

WEBHOOK_RESULT=$(curl -s -X POST "$EVO_URL/webhook/set/$INSTANCE" \
  -H "apikey: $EVO_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"webhook\": {
      \"url\": \"$N8N_WEBHOOK\",
      \"webhookByEvents\": false,
      \"webhookBase64\": false,
      \"events\": [\"MESSAGES_UPSERT\"],
      \"enabled\": true
    }
  }" 2>/dev/null || echo '{"error":"failed"}')

if echo "$WEBHOOK_RESULT" | grep -q "error"; then
    echo "   ⚠️  Webhook setup gagal (auto-reply mungkin tidak aktif)"
    echo "   $WEBHOOK_RESULT"
else
    echo "   ✅ Webhook auto-reply terpasang → $N8N_WEBHOOK"
fi

# ---------- 3. Check connection status ----------
echo ""
echo "🔍 Checking connection status..."
STATUS=$(curl -s "$EVO_URL/instance/connectionState/$INSTANCE" \
  -H "apikey: $EVO_KEY")

STATE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('state','unknown'))" 2>/dev/null || echo "unknown")

if [ "$STATE" = "open" ]; then
    echo "✅ WhatsApp '$INSTANCE' sudah terhubung! 🎉"
    echo ""

    # Get instance info
    INFO=$(curl -s "$EVO_URL/instance/fetchInstances?instanceName=$INSTANCE" \
      -H "apikey: $EVO_KEY")
    echo "Instance info:"
    echo "$INFO" | python3 -m json.tool 2>/dev/null || echo "$INFO"
    echo ""

    # Show rotation pool status
    echo "============================================"
    echo "  🔄 Rotation Pool Status"
    echo "============================================"
    echo ""
    ACTIVE_COUNT=$(echo "$INSTANCES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
count = 0
for inst in data:
    if inst.get('instance', {}).get('status') == 'open':
        count += 1
print(count)
" 2>/dev/null || echo "?")
    echo "  Instance aktif di pool: $ACTIVE_COUNT"
    echo "  Instance ini otomatis masuk ke rotasi pengiriman."
    echo ""
    echo "  Tambah instance baru: ./connect-whatsapp.sh nama-instance"
    echo "  Lihat semua instance: ./manage-instances.sh"
    echo ""
    exit 0
fi

# ---------- 4. Get QR Code ----------
echo "📱 Status: $STATE — perlu scan QR Code"
echo ""
echo "🔄 Generating QR Code..."

QR_RESULT=$(curl -s "$EVO_URL/instance/connect/$INSTANCE" \
  -H "apikey: $EVO_KEY")

# Debug: show raw response structure
echo ""
echo "📋 API Response keys:"
echo "$QR_RESULT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    def show_keys(d, prefix=''):
        if isinstance(d, dict):
            for k, v in d.items():
                val_type = type(v).__name__
                if isinstance(v, str) and len(v) > 100:
                    print(f'  {prefix}{k}: ({val_type}, {len(v)} chars)')
                elif isinstance(v, dict):
                    print(f'  {prefix}{k}: (dict)')
                    show_keys(v, prefix + '  ')
                else:
                    print(f'  {prefix}{k}: {v}')
    show_keys(data)
except Exception as e:
    print(f'  Parse error: {e}')
" 2>/dev/null || echo "  (raw): $QR_RESULT"

# Try to extract base64 QR
QR_BASE64=$(echo "$QR_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
qr = ''
if isinstance(data, dict):
    qr = data.get('base64', '')
    if not qr and 'qrcode' in data:
        q = data['qrcode']
        if isinstance(q, dict):
            qr = q.get('base64', '')
        elif isinstance(q, str):
            qr = q
    if not qr and 'instance' in data and isinstance(data['instance'], dict):
        qr = data['instance'].get('qrcode', {}).get('base64', '') if isinstance(data['instance'].get('qrcode'), dict) else ''
print(qr if qr else '')
" 2>/dev/null || echo "")

QR_CODE=$(echo "$QR_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
code = ''
if isinstance(data, dict):
    code = data.get('code', '')
    if not code and 'qrcode' in data:
        q = data['qrcode']
        if isinstance(q, dict):
            code = q.get('code', '')
    if not code and 'pairingCode' in data:
        code = data.get('pairingCode', '')
print(code if code else '')
" 2>/dev/null || echo "")

QR_FILE="qr-code-${INSTANCE}.png"
if [ -n "$QR_BASE64" ] && [ "$QR_BASE64" != "" ] && [ "$QR_BASE64" != "None" ]; then
    echo "$QR_BASE64" | sed 's|data:image/png;base64,||' | base64 -d > "$QR_FILE" 2>/dev/null || true
    if [ -f "$QR_FILE" ] && [ -s "$QR_FILE" ]; then
        echo ""
        echo "✅ QR Code tersimpan di: $QR_FILE"
        echo ""
        echo "  Download ke laptop:"
        echo "  scp root@$(hostname -I | awk '{print $1}'):$(pwd)/$QR_FILE ."
    fi
fi

echo ""
echo "============================================"
echo "  📷 CARA SCAN QR CODE — $INSTANCE"
echo "============================================"
echo ""
echo "  🌐 CARA TERMUDAH — Buka di browser:"
echo "     $EVO_URL/manager"
echo ""
echo "     1. Masukkan API Key: $EVO_KEY"
echo "     2. Klik instance '$INSTANCE'"
echo "     3. QR code muncul — scan dari HP"
echo ""

if [ -n "$QR_CODE" ] && [ "$QR_CODE" != "" ] && [ "$QR_CODE" != "None" ]; then
    echo "  📝 QR Code text:"
    echo "     $QR_CODE"
    echo ""
fi

echo ""
echo "============================================"
echo "  📱 LANGKAH SCAN:"
echo "============================================"
echo "  1. Buka WhatsApp di HP (NOMOR BARU/BERBEDA)"
echo "  2. Tap ⋮ (menu) → Linked Devices"
echo "  3. Tap 'Link a Device'"
echo "  4. Scan QR code di atas"
echo ""
echo "  ⚠️  Setiap instance harus pakai nomor BERBEDA!"
echo "  Setelah scan, jalankan script ini lagi untuk verifikasi."
echo ""
echo "  Contoh setup multi-instance:"
echo "    ./connect-whatsapp.sh invoice-sender-1   # Nomor WA 1"
echo "    ./connect-whatsapp.sh invoice-sender-2   # Nomor WA 2"
echo "    ./connect-whatsapp.sh invoice-sender-3   # Nomor WA 3"
echo ""
echo "  Semua instance yang connected otomatis masuk"
echo "  ke rotation pool — n8n auto-detect!"
echo ""
echo "============================================"
