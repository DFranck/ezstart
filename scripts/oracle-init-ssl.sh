#!/bin/bash
# Oracle Cloud - Initialize SSL Certificates
# Run this script ONCE after deploying to Oracle Cloud

set -e

echo "🔐 Initializing SSL certificates with Let's Encrypt..."

# Email for Let's Encrypt notifications
read -p "Enter your email for SSL notifications: " EMAIL

# Domains to secure
DOMAINS=(
  "ezauth.ezstart.xyz"
  "ezpay.ezstart.xyz"
  "ezbill.ezstart.xyz"
  "td-api.ezstart.xyz"
  "greenpulse.ezstart.xyz"
  "monitoring.ezstart.xyz"
)

# Check DNS propagation
echo ""
echo "📡 Checking DNS propagation..."
for domain in "${DOMAINS[@]}"; do
  echo -n "Checking $domain... "
  if nslookup $domain > /dev/null 2>&1; then
    echo "✅ OK"
  else
    echo "❌ FAILED - DNS not propagated yet"
    echo "Please wait for DNS propagation and try again later"
    exit 1
  fi
done

# Start Nginx in HTTP-only mode first
echo ""
echo "🚀 Starting Nginx in HTTP-only mode for certificate validation..."
docker compose up -d nginx

# Wait for Nginx to start
sleep 5

# Obtain certificates for all domains
echo ""
echo "📜 Obtaining SSL certificates..."

for domain in "${DOMAINS[@]}"; do
  echo ""
  echo "Getting certificate for $domain..."

  docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $domain

  if [ $? -eq 0 ]; then
    echo "✅ Certificate obtained for $domain"
  else
    echo "❌ Failed to obtain certificate for $domain"
    exit 1
  fi
done

# Restart Nginx to use SSL
echo ""
echo "🔄 Restarting Nginx with SSL enabled..."
docker compose restart nginx

echo ""
echo "✅ SSL certificates successfully configured!"
echo ""
echo "🎉 All APIs are now secured with HTTPS:"
for domain in "${DOMAINS[@]}"; do
  echo "   https://$domain"
done
echo ""
echo "📅 Certificates will auto-renew every 12 hours"
