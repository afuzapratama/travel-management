#!/bin/bash
# ============================================
# CLEANUP — Hapus semua untuk install ulang
# ⚠️  SEMUA DATA AKAN HILANG!
# ============================================

echo ""
echo "============================================"
echo "  🧹 CLEANUP — WhatsApp Automation"
echo "============================================"
echo ""
echo "⚠️  Script ini akan:"
echo "   - Stop & hapus semua containers"
echo "   - Hapus semua Docker volumes (DATA HILANG!)"
echo "   - Hapus .env (credentials hilang!)"
echo "   - Hapus generated Nginx configs"
echo "   - Hapus SSL renewal cron job"
echo ""
read -p "   Yakin mau hapus semua? (ketik YES): " CONFIRM

if [ "$CONFIRM" != "YES" ]; then
    echo "   Dibatalkan."
    exit 0
fi

echo ""

# ---------- 1. Stop containers ----------
echo "🛑 Stopping containers..."
docker compose down --remove-orphans 2>/dev/null || true
echo "  ✅ Containers stopped"

# ---------- 2. Remove volumes ----------
echo "🗑️  Removing Docker volumes..."
docker compose down -v 2>/dev/null || true

# Also remove any orphan volumes from previous runs
for vol in $(docker volume ls -q | grep -E "vps.setup|whatsapp.automation" 2>/dev/null); do
    docker volume rm "$vol" 2>/dev/null || true
done
echo "  ✅ Volumes removed"

# ---------- 3. Remove generated configs ----------
echo "📝 Removing generated configs..."
rm -f nginx/conf.d/default.conf
rm -f nginx/conf.d/wa.gtmgroup.co.id.conf
rm -f nginx/conf.d/n8n.gtmgroup.co.id.conf
echo "  ✅ Nginx configs cleaned"

# ---------- 4. Remove .env ----------
if [ -f .env ]; then
    echo "🔑 Removing .env..."
    rm -f .env
    echo "  ✅ .env removed (credentials hilang)"
fi

# ---------- 5. Remove cron job ----------
echo "⏰ Removing SSL renewal cron..."
(crontab -l 2>/dev/null | grep -v 'certbot renew') | crontab - 2>/dev/null || true
echo "  ✅ Cron job removed"

# ---------- 6. Prune unused Docker resources ----------
echo "🐳 Pruning unused Docker images..."
docker image prune -f 2>/dev/null || true
echo "  ✅ Docker cleaned"

echo ""
echo "============================================"
echo "  ✅ CLEANUP SELESAI!"
echo "============================================"
echo ""
echo "  Semua data sudah dihapus."
echo "  Untuk install ulang: ./setup.sh"
echo ""
echo "============================================"
