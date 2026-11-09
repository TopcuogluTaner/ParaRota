#!/usr/bin/env bash
# ParaRota — Let's Encrypt sertifikası (Cloudflare DNS-01)
# VM'de deploy klasöründe çalıştır:  bash scripts/40-ssl.sh <CF_API_TOKEN>
# DNS-01 kullanır → Cloudflare proxy açık olsa bile çalışır, nginx ayakta olmasına gerek yok.
set -euo pipefail

CF_TOKEN="${1:?Kullanım: 40-ssl.sh <CLOUDFLARE_API_TOKEN>}"
DOMAIN="api.pararotam.com"
EMAIL="${LETSENCRYPT_EMAIL:?LETSENCRYPT_EMAIL ortam değişkenini ayarla}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"   # deploy/

echo "==> Cloudflare credentials dosyası"
mkdir -p "$DIR/secrets"
cat > "$DIR/secrets/cloudflare.ini" <<EOF
dns_cloudflare_api_token = $CF_TOKEN
EOF
chmod 600 "$DIR/secrets/cloudflare.ini"

echo "==> Certbot DNS-01 ile sertifika isteniyor ($DOMAIN)"
cd "$DIR"
docker compose -f docker-compose.prod.yml --profile tools run --rm certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /secrets/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 30 \
  -d "$DOMAIN" \
  --email "$EMAIL" --agree-tos --non-interactive

echo "==> Nginx başlat/yeniden yükle"
docker compose -f docker-compose.prod.yml up -d nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload 2>/dev/null || true

echo ""
echo "✅ Sertifika hazır. Test:  curl -I https://$DOMAIN"
echo "   Yenileme için cron öner:  0 3 * * *  (aşağıdaki renew komutu)"
echo "   docker compose -f $DIR/docker-compose.prod.yml --profile tools run --rm certbot renew && docker compose -f $DIR/docker-compose.prod.yml exec nginx nginx -s reload"
