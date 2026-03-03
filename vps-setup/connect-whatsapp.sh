#!/bin/bash
# ============================================
# CONNECT WHATSAPP
# Run after docker compose is up
# Creates Evolution API instance + shows QR
# ============================================

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DOMAIN="${DOMAIN:-gtmgroup.co.id}"
EVO_DOMAIN="${EVOLUTION_SUBDOMAIN:-wa}.${DOMAIN}"
EVO_KEY="${EVOLUTION_API_KEY:-evo_api_key_change_me}"
INSTANCE="invoice-bot"

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

# ---------- 1. Check if instance exists ----------
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

# ---------- 2. Create instance if not exists ----------
if echo "$INSTANCES" | grep -q "$INSTANCE"; then
    echo "✅ Instance '$INSTANCE' sudah ada"
else
    echo "📝 Membuat instance '$INSTANCE'..."

    # Detect WARP proxy — jika WARP aktif di port 40000, tambahkan proxy config
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

# ---------- 3. Check connection status ----------
echo ""
echo "🔍 Checking connection status..."
STATUS=$(curl -s "$EVO_URL/instance/connectionState/$INSTANCE" \
  -H "apikey: $EVO_KEY")

STATE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('state','unknown'))" 2>/dev/null || echo "unknown")

if [ "$STATE" = "open" ]; then
    echo "✅ WhatsApp sudah terhubung! 🎉"
    echo ""

    # Get instance info
    INFO=$(curl -s "$EVO_URL/instance/fetchInstances?instanceName=$INSTANCE" \
      -H "apikey: $EVO_KEY")
    echo "Instance info:"
    echo "$INFO" | python3 -m json.tool 2>/dev/null || echo "$INFO"
    echo ""
    echo "WhatsApp sudah siap digunakan!"
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

# Try to extract base64 QR — search multiple possible paths
QR_BASE64=$(echo "$QR_RESULT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
# Evolution API v2 puts it in different places
qr = ''
if isinstance(data, dict):
    qr = data.get('base64', '')
    if not qr and 'qrcode' in data:
        q = data['qrcode']
        if isinstance(q, dict):
            qr = q.get('base64', '')
        elif isinstance(q, str):
            qr = q
    # Some versions nest under 'instance'
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

if [ -n "$QR_BASE64" ] && [ "$QR_BASE64" != "" ] && [ "$QR_BASE64" != "None" ]; then
    # Save QR as image
    echo "$QR_BASE64" | sed 's|data:image/png;base64,||' | base64 -d > qr-code.png 2>/dev/null || true
    if [ -f qr-code.png ] && [ -s qr-code.png ]; then
        echo ""
        echo "✅ QR Code tersimpan di: qr-code.png"
        echo ""
        echo "  Download ke laptop:"
        echo "  scp root@$(hostname -I | awk '{print $1}'):$(pwd)/qr-code.png ."
    fi
fi

echo ""
echo "============================================"
echo "  📷 CARA SCAN QR CODE"
echo "============================================"
echo ""
echo "  🌐 CARA TERMUDAH — Buka di browser:"
echo "     $EVO_URL/manager"
echo ""
echo "     1. Masukkan API Key: $EVO_KEY"
echo "     2. Klik instance 'invoice-bot'"
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
echo "  1. Buka WhatsApp di HP"
echo "  2. Tap ⋮ (menu) → Linked Devices"
echo "  3. Tap 'Link a Device'"
echo "  4. Scan QR code di atas"
echo ""
echo "  Setelah scan, jalankan script ini lagi"
echo "  untuk verifikasi koneksi berhasil."
echo ""
echo "============================================"
