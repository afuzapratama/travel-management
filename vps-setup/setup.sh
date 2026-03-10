#!/bin/bash
# ============================================
# VPS SETUP SCRIPT — WhatsApp Automation
# Evolution API + n8n + Nginx + SSL
#
# Subdomains:
#   wa.gtmgroup.co.id  → Evolution API
#   n8n.gtmgroup.co.id → n8n
#
# Prerequisites:
#   - Ubuntu 24
#   - Docker + Docker Compose installed
#   - DNS A records pointing to this VPS:
#       wa.gtmgroup.co.id  → VPS_IP
#       n8n.gtmgroup.co.id → VPS_IP
#
# Usage:
#   chmod +x setup.sh
#   ./setup.sh
# ============================================

set -e

echo ""
echo "============================================"
echo "  WhatsApp Automation — VPS Setup"
echo "  wa.gtmgroup.co.id  + n8n.gtmgroup.co.id"
echo "============================================"
echo ""

# ---------- 1. Check Docker ----------
if ! command -v docker &> /dev/null; then
    echo "❌ Docker belum terinstall!"
    echo "   Install dulu: https://docs.docker.com/engine/install/ubuntu/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose belum terinstall!"
    exit 1
fi

echo "✅ Docker: $(docker --version)"
echo "✅ Compose: $(docker compose version)"
echo ""

# ---------- 2. Create .env if not exists ----------
if [ ! -f .env ]; then
    echo "📝 Membuat .env dari template..."
    cp .env.example .env

    # Auto-detect VPS IP
    VPS_IP=$(hostname -I | awk '{print $1}')
    echo "🌐 Detected VPS IP: $VPS_IP"

    # Generate random secrets
    POSTGRES_PW=$(openssl rand -hex 16)
    EVO_API_KEY=$(openssl rand -hex 20)
    N8N_PW=$(openssl rand -hex 12)

    # Replace placeholders in .env
    sed -i "s|n8n_secret_change_me|$POSTGRES_PW|g" .env
    sed -i "s|evo_api_key_change_me|$EVO_API_KEY|g" .env
    sed -i "s|admin_change_me|$N8N_PW|g" .env

    echo ""
    echo "📋 Generated credentials (simpan baik-baik!):"
    echo "   PostgreSQL Password : $POSTGRES_PW"
    echo "   Evolution API Key   : $EVO_API_KEY"
    echo "   n8n User            : admin"
    echo "   n8n Password        : $N8N_PW"
    echo ""
    echo "⚠️  Credentials juga tersimpan di file .env"
    echo ""
else
    echo "✅ File .env sudah ada, skip generate"
fi

# Load .env
export $(grep -v '^#' .env | grep -v '^$' | xargs)

DOMAIN="${DOMAIN:-gtmgroup.co.id}"
EVO_DOMAIN="${EVOLUTION_SUBDOMAIN:-wa}.${DOMAIN}"
N8N_DOMAIN="${N8N_SUBDOMAIN:-n8n}.${DOMAIN}"
SSL_EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"
EVO_API_KEY="${EVOLUTION_API_KEY}"
N8N_PW="${N8N_PASSWORD}"

echo "🌐 Domain setup:"
echo "   Evolution API : $EVO_DOMAIN"
echo "   n8n           : $N8N_DOMAIN"
echo ""

# ---------- 3. Check DNS ----------
echo "🔍 Checking DNS records..."
VPS_IP=$(hostname -I | awk '{print $1}')

check_dns() {
    local domain=$1
    local resolved=$(dig +short "$domain" 2>/dev/null | head -1)
    if [ "$resolved" = "$VPS_IP" ]; then
        echo "  ✅ $domain → $resolved"
        return 0
    elif [ -n "$resolved" ]; then
        echo "  ⚠️  $domain → $resolved (expected $VPS_IP)"
        return 1
    else
        echo "  ❌ $domain — tidak ditemukan (belum set DNS A record)"
        return 1
    fi
}

DNS_OK=true
check_dns "$EVO_DOMAIN" || DNS_OK=false
check_dns "$N8N_DOMAIN" || DNS_OK=false

if [ "$DNS_OK" = false ]; then
    echo ""
    echo "⚠️  DNS belum benar. Pastikan di DNS provider kamu:"
    echo "    A record:  ${EVOLUTION_SUBDOMAIN:-wa}  →  $VPS_IP"
    echo "    A record:  ${N8N_SUBDOMAIN:-n8n}  →  $VPS_IP"
    echo ""
    read -p "   Lanjut tanpa DNS check? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        echo "   Setup dibatalkan. Fix DNS dulu, lalu jalankan ./setup.sh lagi."
        exit 1
    fi
fi
echo ""

# ---------- 4. Open firewall ports ----------
echo "🔥 Configuring firewall (ufw)..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp comment "HTTP" 2>/dev/null || true
    sudo ufw allow 443/tcp comment "HTTPS" 2>/dev/null || true
    echo "✅ Ports 80 (HTTP) dan 443 (HTTPS) terbuka"
else
    echo "⚠️  ufw not found — pastikan port 80 dan 443 terbuka di firewall/security group"
fi
echo ""

# ---------- 5. Prepare Nginx — HTTP only (for certbot) ----------
echo "📝 Setting up Nginx (HTTP only mode)..."
mkdir -p nginx/conf.d

# IMPORTANT: Only put HTTP-only config in conf.d
# HTTPS configs are in nginx/sites-ssl/ — they get copied AFTER SSL certs exist
rm -f nginx/conf.d/*.conf
cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf
echo "  ✅ HTTP-only config active (HTTPS configs in standby)"
echo ""

# ---------- 6. Pull & Start (HTTP mode) ----------
echo "🐳 Pulling Docker images (ini bisa lama pertama kali)..."
docker compose pull

echo ""
echo "🚀 Starting services (HTTP mode)..."
docker compose up -d

echo ""
echo "⏳ Menunggu services ready..."
sleep 15

# Wait specifically for evolution-api (can be slow on first start)
echo "🔍 Waiting for Evolution API..."
for i in $(seq 1 8); do
    EVO_STATUS=$(docker inspect -f '{{.State.Status}}' wa-evolution 2>/dev/null || echo "not found")
    if [ "$EVO_STATUS" = "running" ]; then
        # Double-check it's stable (not about to crash)
        sleep 3
        EVO_STATUS2=$(docker inspect -f '{{.State.Status}}' wa-evolution 2>/dev/null || echo "not found")
        if [ "$EVO_STATUS2" = "running" ]; then
            echo "  ✅ Evolution API stable"
            break
        fi
    fi
    if [ $i -eq 8 ]; then
        echo "  ⚠️  Evolution API belum stabil setelah 60 detik"
        echo "     Logs:"
        docker logs wa-evolution --tail=15 2>&1 | sed 's/^/     /' || true
    else
        echo "  ⏳ wa-evolution: $EVO_STATUS — waiting... ($i/8)"
        sleep 5
    fi
done

# Full health check
echo ""
echo "🔍 Service status check..."
ALL_OK=true
for svc in wa-postgres wa-redis wa-evolution wa-n8n wa-nginx; do
    STATUS=$(docker inspect -f '{{.State.Status}}' $svc 2>/dev/null || echo "not found")
    if [ "$STATUS" = "running" ]; then
        echo "  ✅ $svc: running"
    else
        echo "  ❌ $svc: $STATUS"
        echo "     Last 10 log lines:"
        docker logs $svc --tail=10 2>&1 | sed 's/^/     /' || true
        ALL_OK=false
    fi
done

# Verify Nginx is actually responding
echo ""
echo "🔍 Verifying HTTP is working..."
HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost" 2>/dev/null || echo "000")
if [ "$HTTP_CHECK" != "000" ]; then
    echo "  ✅ Nginx responding (HTTP $HTTP_CHECK)"
else
    echo "  ❌ Nginx not responding"
    echo "     Mencoba restart..."
    docker compose restart nginx
    sleep 5
    HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost" 2>/dev/null || echo "000")
    if [ "$HTTP_CHECK" != "000" ]; then
        echo "  ✅ Nginx responding after restart (HTTP $HTTP_CHECK)"
    else
        echo "  ❌ Nginx tetap gagal. Cek: docker logs wa-nginx"
    fi
fi

if [ "$ALL_OK" = false ]; then
    echo ""
    echo "⚠️  Ada service yang bermasalah. Cek log di atas."
    echo "   Detail: docker compose logs <nama-service>"
    echo ""
    read -p "   Lanjut ke SSL setup? (y/n): " CONTINUE_SSL
    if [ "$CONTINUE_SSL" != "y" ]; then
        echo "   Setup dihentikan. Fix service dulu, lalu jalankan ./setup-ssl.sh"
        exit 1
    fi
fi
echo ""

# ---------- 7. Obtain SSL certificates ----------
echo "🔐 Requesting SSL certificates from Let's Encrypt..."
echo "   Email: $SSL_EMAIL"
echo ""

SSL_SUCCESS=true

# Request cert for wa.gtmgroup.co.id
echo "📜 Requesting certificate for $EVO_DOMAIN..."
if docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$SSL_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "$EVO_DOMAIN"; then
    echo "  ✅ SSL certificate for $EVO_DOMAIN berhasil!"
else
    echo "  ❌ SSL untuk $EVO_DOMAIN gagal"
    SSL_SUCCESS=false
fi

echo ""

# Request cert for n8n.gtmgroup.co.id
echo "📜 Requesting certificate for $N8N_DOMAIN..."
if docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$SSL_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    -d "$N8N_DOMAIN"; then
    echo "  ✅ SSL certificate for $N8N_DOMAIN berhasil!"
else
    echo "  ❌ SSL untuk $N8N_DOMAIN gagal"
    SSL_SUCCESS=false
fi

echo ""

# ---------- 8. Activate HTTPS Nginx config ----------
if [ "$SSL_SUCCESS" = true ]; then
    echo "🔄 Activating HTTPS Nginx config..."

    # Copy HTTPS configs from sites-ssl/ to conf.d/
    cp nginx/sites-ssl/*.conf nginx/conf.d/

    # Remove the HTTP-only initial config
    rm -f nginx/conf.d/default.conf

    echo "  ✅ HTTPS configs copied to conf.d/"

    # Reload Nginx with new config
    echo "  🔄 Reloading Nginx..."
    docker compose restart nginx
    sleep 3

    # Verify
    NGINX_STATUS=$(docker inspect -f '{{.State.Status}}' wa-nginx 2>/dev/null || echo "not found")
    if [ "$NGINX_STATUS" = "running" ]; then
        echo "  ✅ Nginx running with HTTPS!"

        # Switch .env URLs from http to https
        echo ""
        echo "🔄 Updating .env URLs to HTTPS..."
        sed -i 's|EVOLUTION_SERVER_URL=http://|EVOLUTION_SERVER_URL=https://|' .env
        sed -i 's|N8N_WEBHOOK_URL=http://|N8N_WEBHOOK_URL=https://|' .env
        sed -i 's|N8N_EDITOR_BASE_URL=http://|N8N_EDITOR_BASE_URL=https://|' .env
        echo "  ✅ .env updated to HTTPS"

        # Restart services to pick up new URLs
        echo "  🔄 Restarting services with HTTPS URLs..."
        docker compose up -d
        sleep 5
        echo "  ✅ Services restarted"

        # Setup cron for auto SSL renewal
        echo ""
        echo "⏰ Setting up SSL auto-renewal (cron)..."
        CRON_CMD="0 3 * * * cd $(pwd) && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload"
        (crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "$CRON_CMD") | crontab - 2>/dev/null || true
        echo "  ✅ SSL renewal cron installed (daily 03:00)"
    else
        echo "  ❌ Nginx gagal start dengan HTTPS config"
        echo "     Rollback ke HTTP mode..."
        rm -f nginx/conf.d/wa.gtmgroup.co.id.conf nginx/conf.d/n8n.gtmgroup.co.id.conf
        cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf
        docker compose restart nginx
        echo "  ⚠️  Running in HTTP mode. Debug: docker logs wa-nginx"
    fi
else
    echo "⚠️  SSL gagal — tetap running di HTTP mode"
    echo "   Setelah fix DNS, jalankan: ./setup-ssl.sh"
fi

echo ""

# ---------- 9. Final Health Check ----------
echo "🔍 Final status check..."
echo ""
for svc in wa-postgres wa-redis wa-evolution wa-n8n wa-nginx; do
    STATUS=$(docker inspect -f '{{.State.Status}}' $svc 2>/dev/null || echo "not found")
    if [ "$STATUS" = "running" ]; then
        echo "  ✅ $svc: running"
    else
        echo "  ❌ $svc: $STATUS"
        docker logs $svc --tail=5 2>&1 | sed 's/^/     /' || true
    fi
done

PROTO="https"
if [ "$SSL_SUCCESS" = false ]; then
    PROTO="http"
fi

echo ""
echo "============================================"
echo "  🎉 SETUP SELESAI!"
echo "============================================"
echo ""
echo "📱 Evolution API (WhatsApp Gateway):"
echo "   URL     : $PROTO://$EVO_DOMAIN"
echo "   API Key : $EVO_API_KEY"
echo ""
echo "🔧 n8n (Workflow Automation):"
echo "   URL      : $PROTO://$N8N_DOMAIN"
echo "   User     : admin"
echo "   Password : $N8N_PW"
echo ""
echo "============================================"
echo "  LANGKAH SELANJUTNYA:"
echo "============================================"
echo ""
echo "1️⃣  Connect WhatsApp (minimal 1 instance, bisa tambah lebih):"
echo "    ./connect-whatsapp.sh invoice-sender-1"
echo "    ./connect-whatsapp.sh invoice-sender-2   # opsional"
echo "    ./connect-whatsapp.sh invoice-sender-3   # opsional"
echo ""
echo "2️⃣  Import n8n workflow (Rotating Sender):"
echo "    Buka $PROTO://$N8N_DOMAIN → login → Import workflow"
echo "    File: n8n-workflow.json"
echo "    ⚠️  Ganti 'GANTI_DENGAN_EVOLUTION_API_KEY' di kedua Code node"
echo "       dengan API key: $EVO_API_KEY"
echo ""
echo "3️⃣  Set di .env project invoice-system:"
echo "    VITE_WHATSAPP_API_URL=$PROTO://$N8N_DOMAIN"
echo ""
echo "4️⃣  Test kirim WhatsApp (lihat rotasi!):"
echo "    ./test-send.sh"
echo ""
echo "5️⃣  Lihat instance pool:"
echo "    ./manage-instances.sh"
echo ""
if [ "$SSL_SUCCESS" = false ]; then
echo "⚠️  SSL belum aktif. Setelah DNS propagate, jalankan:"
echo "    ./setup-ssl.sh"
echo ""
fi
echo "============================================"
