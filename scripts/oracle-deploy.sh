#!/bin/bash
# Oracle Cloud - Deploy All APIs
# Run this script on your Oracle Cloud VM

set -e

echo "🚀 Deploying all APIs to Oracle Cloud..."

# Check if .env exists
if [ ! -f .env ]; then
  echo "❌ Error: .env file not found"
  echo "Please create .env from .env.oracle.example and fill in your secrets"
  exit 1
fi

# Pull latest code
echo ""
echo "📥 Pulling latest code from git..."
git pull origin master

# Build all containers
echo ""
echo "🔨 Building Docker containers (this may take 10-15 minutes)..."
docker compose build --parallel

# Stop existing containers
echo ""
echo "🛑 Stopping existing containers..."
docker compose down

# Start all containers
echo ""
echo "🚀 Starting all containers..."
docker compose up -d

# Wait for containers to be healthy
echo ""
echo "⏳ Waiting for containers to be healthy..."
sleep 30

# Check health of all APIs
echo ""
echo "🏥 Checking API health..."

APIs=(
  "http://localhost:5010/api/health:EZAuth"
  "http://localhost:5040/api/health:EZPay"
  "http://localhost:5020/api/health:EZBill"
  "http://localhost:5030/api/health:Tower Defense"
  "http://localhost:5070/api/health:GreenPulse"
  "http://localhost:5000/api/health:Monitoring"
)

ALL_HEALTHY=true

for api in "${APIs[@]}"; do
  IFS=':' read -r url name <<< "$api"
  echo -n "Checking $name... "

  if curl -sf $url > /dev/null; then
    echo "✅ OK"
  else
    echo "❌ FAILED"
    ALL_HEALTHY=false
  fi
done

echo ""
if [ "$ALL_HEALTHY" = true ]; then
  echo "✅ All APIs are healthy and running!"
  echo ""
  echo "📊 Container status:"
  docker compose ps
  echo ""
  echo "🎉 Deployment successful!"
  echo ""
  echo "📝 Next steps:"
  echo "   1. Update DNS to point to this server's IP"
  echo "   2. Run ./scripts/oracle-init-ssl.sh to setup HTTPS"
  echo "   3. Update Vercel environment variables to use new URLs"
else
  echo "❌ Some APIs failed to start. Check logs:"
  echo "   docker compose logs -f"
  exit 1
fi
