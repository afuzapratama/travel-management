#!/bin/bash
# ============================================
# MANAGE WHATSAPP INSTANCES
# View, restart, and manage all WA instances
# in the rotation pool
#
# Usage:
#   ./manage-instances.sh              # Tampilkan semua instance
#   ./manage-instances.sh status       # Status detail
#   ./manage-instances.sh restart NAME # Restart instance
#   ./manage-instances.sh delete NAME  # Hapus instance
#   ./manage-instances.sh logout NAME  # Logout (disconnect WA)
# ============================================

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DOMAIN="${DOMAIN:-gtmgroup.co.id}"
EVO_DOMAIN="${EVOLUTION_SUBDOMAIN:-wa}.${DOMAIN}"
EVO_KEY="${EVOLUTION_API_KEY:-evo_api_key_change_me}"
ACTION="${1:-status}"
INSTANCE_NAME="${2:-}"

# Auto-detect HTTPS or HTTP
if curl -sk --max-time 3 "https://$EVO_DOMAIN" >/dev/null 2>&1; then
    EVO_URL="https://$EVO_DOMAIN"
else
    EVO_URL="http://$EVO_DOMAIN"
fi

# ---------- Fetch all instances ----------
fetch_instances() {
    curl -s "$EVO_URL/instance/fetchInstances" \
      -H "apikey: $EVO_KEY" 2>/dev/null || echo "[]"
}

# ---------- STATUS: Show all instances ----------
show_status() {
    echo ""
    echo "============================================"
    echo "  🔄 WhatsApp Instance Pool — Rotation Status"
    echo "============================================"
    echo ""
    echo "Evolution API: $EVO_URL"
    echo ""

    INSTANCES=$(fetch_instances)

    if echo "$INSTANCES" | grep -q "error\|ECONNREFUSED"; then
        echo "❌ Gagal connect ke Evolution API"
        echo "   Cek: docker compose ps"
        exit 1
    fi

    echo "$INSTANCES" | python3 -c "
import sys, json

data = json.load(sys.stdin)
if not isinstance(data, list):
    print('❌ Format response tidak dikenal')
    sys.exit(1)

total = len(data)
connected = 0
disconnected = 0

print(f'  Total Instances: {total}')
print('')
print('  ┌─────────────────────────────┬────────────┬──────────────────┐')
print('  │ Instance Name               │ Status     │ Phone            │')
print('  ├─────────────────────────────┼────────────┼──────────────────┤')

for inst in data:
    i = inst.get('instance', inst)
    name = i.get('instanceName', '?')
    status = i.get('status', '?')
    
    # Try to get phone number from instance info
    owner = i.get('owner', '')
    
    if status == 'open':
        icon = '🟢'
        status_text = 'Connected'
        connected += 1
    elif status == 'connecting':
        icon = '🟡'
        status_text = 'Connecting'
    else:
        icon = '🔴'
        status_text = 'Offline'
        disconnected += 1
    
    name_display = f'{icon} {name}'
    print(f'  │ {name_display:<28}│ {status_text:<11}│ {owner:<17}│')

print('  └─────────────────────────────┴────────────┴──────────────────┘')
print('')
print(f'  🟢 Aktif di rotasi: {connected}')
print(f'  🔴 Offline/disconnect: {disconnected}')
print('')

if connected == 0:
    print('  ⚠️  Tidak ada instance yang aktif!')
    print('     Jalankan: ./connect-whatsapp.sh <nama-instance>')
elif connected == 1:
    print('  💡 Hanya 1 instance aktif. Tambah lebih banyak untuk rotasi:')
    print('     ./connect-whatsapp.sh invoice-sender-2')
else:
    print(f'  ✅ {connected} instance aktif — rotasi round-robin berjalan')
    print('     n8n otomatis rotasi antar instance saat kirim invoice')
" 2>/dev/null || echo "   (gagal parse response)"

    echo ""
    echo "============================================"
    echo "  📝 Perintah:"
    echo "============================================"
    echo "  Tambah instance: ./connect-whatsapp.sh <nama>"
    echo "  Lihat status:    ./manage-instances.sh status"
    echo "  Restart:         ./manage-instances.sh restart <nama>"
    echo "  Logout WA:       ./manage-instances.sh logout <nama>"
    echo "  Hapus instance:  ./manage-instances.sh delete <nama>"
    echo ""
}

# ---------- RESTART: Restart an instance ----------
restart_instance() {
    if [ -z "$INSTANCE_NAME" ]; then
        echo "❌ Nama instance wajib diisi"
        echo "   Usage: ./manage-instances.sh restart <nama-instance>"
        exit 1
    fi

    echo "🔄 Restarting instance '$INSTANCE_NAME'..."

    RESULT=$(curl -s -X PUT "$EVO_URL/instance/restart/$INSTANCE_NAME" \
      -H "apikey: $EVO_KEY" 2>/dev/null || echo '{"error":"connection failed"}')

    if echo "$RESULT" | grep -q "error"; then
        echo "❌ Gagal restart: $RESULT"
    else
        echo "✅ Instance '$INSTANCE_NAME' di-restart"
        echo "   Tunggu 10 detik lalu cek status..."
        sleep 10
        STATUS=$(curl -s "$EVO_URL/instance/connectionState/$INSTANCE_NAME" \
          -H "apikey: $EVO_KEY" 2>/dev/null || echo '{"state":"unknown"}')
        STATE=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin).get('state','unknown'))" 2>/dev/null || echo "unknown")
        
        if [ "$STATE" = "open" ]; then
            echo "   ✅ Status: Connected"
        else
            echo "   ⚠️  Status: $STATE — mungkin perlu scan QR lagi"
            echo "   Jalankan: ./connect-whatsapp.sh $INSTANCE_NAME"
        fi
    fi
}

# ---------- LOGOUT: Disconnect WhatsApp ----------
logout_instance() {
    if [ -z "$INSTANCE_NAME" ]; then
        echo "❌ Nama instance wajib diisi"
        echo "   Usage: ./manage-instances.sh logout <nama-instance>"
        exit 1
    fi

    echo "⚠️  Logout akan disconnect WhatsApp dari instance '$INSTANCE_NAME'"
    read -p "   Lanjut? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        echo "   Dibatalkan."
        exit 0
    fi

    RESULT=$(curl -s -X DELETE "$EVO_URL/instance/logout/$INSTANCE_NAME" \
      -H "apikey: $EVO_KEY" 2>/dev/null || echo '{"error":"connection failed"}')

    echo "✅ Instance '$INSTANCE_NAME' logout"
    echo "   Instance tetap ada tapi tidak connected."
    echo "   Untuk reconnect: ./connect-whatsapp.sh $INSTANCE_NAME"
}

# ---------- DELETE: Remove instance ----------
delete_instance() {
    if [ -z "$INSTANCE_NAME" ]; then
        echo "❌ Nama instance wajib diisi"
        echo "   Usage: ./manage-instances.sh delete <nama-instance>"
        exit 1
    fi

    echo "⚠️  HAPUS instance '$INSTANCE_NAME'?"
    echo "   Instance akan dihapus dari Evolution API."
    echo "   WhatsApp pada nomor ini akan disconnect."
    read -p "   Lanjut? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
        echo "   Dibatalkan."
        exit 0
    fi

    RESULT=$(curl -s -X DELETE "$EVO_URL/instance/delete/$INSTANCE_NAME" \
      -H "apikey: $EVO_KEY" 2>/dev/null || echo '{"error":"connection failed"}')

    if echo "$RESULT" | grep -q "error"; then
        echo "❌ Gagal hapus: $RESULT"
    else
        echo "✅ Instance '$INSTANCE_NAME' dihapus"
        echo "   Instance otomatis keluar dari rotation pool."
    fi
}

# ---------- Route action ----------
case "$ACTION" in
    status|"")
        show_status
        ;;
    restart)
        restart_instance
        ;;
    logout)
        logout_instance
        ;;
    delete)
        delete_instance
        ;;
    *)
        echo "❌ Action tidak dikenal: $ACTION"
        echo ""
        echo "Usage:"
        echo "  ./manage-instances.sh              # Tampilkan status"
        echo "  ./manage-instances.sh status        # Tampilkan status"
        echo "  ./manage-instances.sh restart NAME  # Restart instance"
        echo "  ./manage-instances.sh logout NAME   # Logout WhatsApp"
        echo "  ./manage-instances.sh delete NAME   # Hapus instance"
        exit 1
        ;;
esac
