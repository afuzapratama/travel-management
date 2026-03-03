#!/bin/bash
# ============================================
# TEST WhatsApp Message Sending
# Sends a test message through n8n webhook
# ============================================

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DOMAIN="${DOMAIN:-gtmgroup.co.id}"
EVO_DOMAIN="${EVOLUTION_SUBDOMAIN:-wa}.${DOMAIN}"
N8N_DOMAIN="${N8N_SUBDOMAIN:-n8n}.${DOMAIN}"
EVO_KEY="${EVOLUTION_API_KEY}"
INSTANCE="invoice-bot"

# Auto-detect HTTPS or HTTP
if curl -sk --max-time 3 "https://$EVO_DOMAIN" >/dev/null 2>&1; then
    EVO_URL="https://$EVO_DOMAIN"
    N8N_URL="https://$N8N_DOMAIN"
else
    EVO_URL="http://$EVO_DOMAIN"
    N8N_URL="http://$N8N_DOMAIN"
fi

echo ""
echo "============================================"
echo "  🧪 Test WhatsApp Sending"
echo "============================================"
echo ""

# ---------- 1. Check Evolution API ----------
echo "1️⃣  Checking Evolution API..."
EVO_STATUS=$(curl -s "$EVO_URL/instance/connectionState/$INSTANCE" \
  -H "apikey: $EVO_KEY" 2>/dev/null || echo '{"state":"error"}')

STATE=$(echo "$EVO_STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('state','error'))" 2>/dev/null || echo "error")

if [ "$STATE" = "open" ]; then
    echo "   ✅ Evolution API: Connected"
else
    echo "   ❌ Evolution API: $STATE"
    echo "   → Jalankan ./connect-whatsapp.sh dulu"
    exit 1
fi

# ---------- 2. Check n8n ----------
echo "2️⃣  Checking n8n..."
N8N_HEALTH=$(curl -s "$N8N_URL/healthz" 2>/dev/null || echo "error")
if echo "$N8N_HEALTH" | grep -qi "ok\|healthy"; then
    echo "   ✅ n8n: Healthy"
else
    echo "   ⚠️  n8n health: $N8N_HEALTH (mungkin perlu login dulu)"
fi

# ---------- 3. Send test message ----------
echo ""
echo "3️⃣  Mengirim test message..."

# Ask for phone number
read -p "   Masukkan nomor WA tujuan (cth: 08123456789): " TEST_PHONE

if [ -z "$TEST_PHONE" ]; then
    echo "   ❌ Nomor tidak boleh kosong"
    exit 1
fi

# Clean phone number
CLEAN_PHONE=$(echo "$TEST_PHONE" | sed 's/[^0-9+]//g')
if [[ "$CLEAN_PHONE" == 08* ]]; then
    CLEAN_PHONE="62${CLEAN_PHONE:1}"
fi
if [[ "$CLEAN_PHONE" == +* ]]; then
    CLEAN_PHONE="${CLEAN_PHONE:1}"
fi

echo "   📱 Sending to: $CLEAN_PHONE"
echo ""

# Send via n8n webhook
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$N8N_URL/webhook/whatsapp-invoice" \
  -H "Content-Type: application/json" \
  -d "{
    \"phone\": \"$CLEAN_PHONE\",
    \"message\": \"🧪 *TEST — Invoice System*\n\nIni adalah pesan test dari sistem invoice.\nWhatsApp automation berhasil!\n\nTimestamp: $(date '+%Y-%m-%d %H:%M:%S')\n\n— PT Global Teknik Multi Guna\",
    \"fileName\": \"\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "   HTTP Status: $HTTP_CODE"
echo "   Response: $BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Test berhasil! Cek WhatsApp tujuan"
else
    echo "   ❌ Test gagal. Cek:"
    echo "      - n8n workflow sudah aktif?"
    echo "      - Webhook path: /webhook/whatsapp-invoice"
    echo "      - Evolution API connected?"
    echo ""
    echo "   Debug log:"
    echo "      docker compose logs --tail=20 wa-n8n"
    echo "      docker compose logs --tail=20 wa-evolution"
fi

echo ""
