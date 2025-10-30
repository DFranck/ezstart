#!/bin/bash
# Oracle Cloud - Update Deployed APIs
# Use this script to update running APIs with latest code

set -e

echo "🔄 Updating deployed APIs..."

# Pull latest code
echo ""
echo "📥 Pulling latest code from git..."
git pull origin master

# Rebuild changed containers
echo ""
echo "🔨 Rebuilding containers..."
docker compose build --parallel

# Rolling update (restart one by one to minimize downtime)
echo ""
echo "♻️ Performing rolling update..."

SERVICES=(
  "monitoring-api"
  "green-pulse-api"
  "tower-defense-api"
  "ezbill-api"
  "ezpay-api"
  "ezauth-api"
)

for service in "${SERVICES[@]}"; do
  echo ""
  echo "Updating $service..."
  docker compose up -d --no-deps $service

  # Wait for health check
  sleep 10

  if docker compose ps $service | grep -q "Up"; then
    echo "✅ $service updated successfully"
  else
    echo "❌ $service failed to start"
    echo "Rolling back..."
    docker compose logs $service
    exit 1
  fi
done

# Restart nginx (no downtime)
echo ""
echo "🔄 Restarting Nginx..."
docker compose restart nginx

echo ""
echo "✅ All APIs updated successfully!"
echo ""
echo "📊 Container status:"
docker compose ps
