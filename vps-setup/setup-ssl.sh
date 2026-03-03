#!/bin/bash
# ============================================
# SETUP SSL — Retry SSL certificate request
# Run this if SSL failed during initial setup
# (e.g., DNS was not ready yet)
# ============================================

set -e

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
fi

DOMAIN="${DOMAIN:-gtmgroup.co.id}"
EVO_DOMAIN="${EVOLUTION_SUBDOMAIN:-wa}.${DOMAIN}"
N8N_DOMAIN="${N8N_SUBDOMAIN:-n8n}.${DOMAIN}"
SSL_EMAIL="${SSL_EMAIL:-admin@${DOMAIN}}"

echo ""
echo "============================================"
echo "  🔐 SSL Certificate Setup"
echo "  $EVO_DOMAIN + $N8N_DOMAIN"
echo "============================================"
echo ""

# Check DNS first
VPS_IP=$(hostname -I | awk '{print $1}')
echo "🔍 Checking DNS..."
for d in "$EVO_DOMAIN" "$N8N_DOMAIN"; do
    resolved=$(dig +short "$d" 2>/dev/null | head -1)
    if [ "$resolved" = "$VPS_IP" ]; then
        echo "  ✅ $d → $resolved"
    else
        echo "  ❌ $d → ${resolved:-NOT FOUND} (expected $VPS_IP)"
        echo ""
        echo "  Fix DNS dulu sebelum request SSL!"
        exit 1
    fi
done
echo ""

# Make sure Nginx is in HTTP mode
echo "📝 Ensuring HTTP-only Nginx config..."
rm -f nginx/conf.d/wa.gtmgroup.co.id.conf nginx/conf.d/n8n.gtmgroup.co.id.conf
cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf
docker compose restart nginx
sleep 3

# Verify Nginx responding
HTTP_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost" 2>/dev/null || echo "000")
if [ "$HTTP_CHECK" = "000" ]; then
    echo "  ❌ Nginx not responding. Check: docker logs wa-nginx"
    exit 1
fi
echo "  ✅ Nginx HTTP ready"
echo ""

# Request certs
SSL_OK=true

echo "📜 Requesting certificate for $EVO_DOMAIN..."
if docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$SSL_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --force-renewal \
    -d "$EVO_DOMAIN"; then
    echo "  ✅ $EVO_DOMAIN SSL OK!"
else
    echo "  ❌ $EVO_DOMAIN SSL gagal"
    SSL_OK=false
fi

echo ""
echo "📜 Requesting certificate for $N8N_DOMAIN..."
if docker compose run --rm certbot certonly \
    --webroot -w /var/www/certbot \
    --email "$SSL_EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --force-renewal \
    -d "$N8N_DOMAIN"; then
    echo "  ✅ $N8N_DOMAIN SSL OK!"
else
    echo "  ❌ $N8N_DOMAIN SSL gagal"
    SSL_OK=false
fi

echo ""

if [ "$SSL_OK" = false ]; then
    echo "❌ Ada SSL yang gagal. Cek error di atas."
    echo "   Kemungkinan: DNS belum propagate, atau rate limit Let's Encrypt"
    exit 1
fi

# Switch to HTTPS config
echo "🔄 Activating HTTPS Nginx config..."
cp nginx/sites-ssl/*.conf nginx/conf.d/
rm -f nginx/conf.d/default.conf

docker compose restart nginx
sleep 3

NGINX_STATUS=$(docker inspect -f '{{.State.Status}}' wa-nginx 2>/dev/null || echo "error")
if [ "$NGINX_STATUS" = "running" ]; then
    echo "  ✅ Nginx running with HTTPS!"

    # Switch .env URLs from http to https
    echo ""
    echo "🔄 Updating .env URLs to HTTPS..."
    sed -i 's|EVOLUTION_SERVER_URL=http://|EVOLUTION_SERVER_URL=https://|' .env
    sed -i 's|N8N_WEBHOOK_URL=http://|N8N_WEBHOOK_URL=https://|' .env
    sed -i 's|N8N_EDITOR_BASE_URL=http://|N8N_EDITOR_BASE_URL=https://|' .env
    echo "  ✅ .env updated to HTTPS"

    # Restart services to pick up new HTTPS URLs
    echo "  🔄 Restarting services..."
    docker compose up -d
    sleep 5

    # Setup cron for auto SSL renewal
    echo ""
    echo "⏰ Setting up SSL auto-renewal (cron)..."
    CRON_CMD="0 3 * * * cd $(pwd) && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload"
    (crontab -l 2>/dev/null | grep -v 'certbot renew'; echo "$CRON_CMD") | crontab - 2>/dev/null || true
    echo "  ✅ SSL renewal cron installed (daily 03:00)"
else
    echo "  ❌ Nginx gagal. Rollback ke HTTP..."
    rm -f nginx/conf.d/wa.gtmgroup.co.id.conf nginx/conf.d/n8n.gtmgroup.co.id.conf
    cp nginx/conf.d/default.conf.initial nginx/conf.d/default.conf
    docker compose restart nginx
    echo "  ⚠️  Check logs: docker logs wa-nginx"
    exit 1
fi

echo ""
echo "============================================"
echo "  ✅ SSL AKTIF!"
echo "============================================"
echo ""
echo "  https://$EVO_DOMAIN  ← Evolution API"
echo "  https://$N8N_DOMAIN  ← n8n"
echo ""
echo "============================================"
