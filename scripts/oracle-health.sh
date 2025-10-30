#!/bin/bash
# Oracle Cloud - Check Health Status
# Quick health check for all APIs

echo "🏥 Checking health status of all APIs..."
echo ""

# Container status
echo "📊 Container Status:"
docker compose ps
echo ""

# API health checks
echo "🌐 API Health Checks:"

APIs=(
  "http://localhost:5010/api/health:EZAuth:https://ezauth.ezstart.xyz"
  "http://localhost:5040/api/health:EZPay:https://ezpay.ezstart.xyz"
  "http://localhost:5020/api/health:EZBill:https://ezbill.ezstart.xyz"
  "http://localhost:5030/api/health:Tower Defense:https://td-api.ezstart.xyz"
  "http://localhost:5070/api/health:GreenPulse:https://greenpulse.ezstart.xyz"
  "http://localhost:5000/api/health:Monitoring:https://monitoring.ezstart.xyz"
)

for api in "${APIs[@]}"; do
  IFS=':' read -r url name domain <<< "$api"
  echo -n "$name ($domain)... "

  if curl -sf $url > /dev/null; then
    echo "✅ Healthy"
  else
    echo "❌ Down"
  fi
done

echo ""

# Resource usage
echo "💻 Resource Usage:"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""

# Disk usage
echo "💾 Disk Usage:"
df -h / | tail -1 | awk '{print "Root: "$3" / "$2" ("$5" used)"}'

echo ""

# SSL certificate status
echo "🔐 SSL Certificate Status:"
if [ -d "/etc/letsencrypt/live/ezauth.ezstart.xyz" ]; then
  EXPIRY=$(docker compose run --rm certbot certificates 2>/dev/null | grep "Expiry Date" | head -1 | awk -F': ' '{print $2}')
  echo "Certificates expire: $EXPIRY"
else
  echo "⚠️ SSL certificates not configured yet"
  echo "Run: ./scripts/oracle-init-ssl.sh"
fi
