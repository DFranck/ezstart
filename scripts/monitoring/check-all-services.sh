#!/bin/bash

# Script to check all services health
# Usage: bash scripts/monitoring/check-all-services.sh

echo "🔍 Checking all services health..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check URL
check_url() {
  local name=$1
  local url=$2
  local timeout=5

  if curl -sf --max-time $timeout "$url" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} $name - ${GREEN}HEALTHY${NC}"
    return 0
  else
    echo -e "${RED}✗${NC} $name - ${RED}UNHEALTHY${NC}"
    return 1
  fi
}

# APIs
echo "📡 Checking APIs..."
check_url "EZAuth API" "http://localhost:6110/api/health"
check_url "EZPay API" "http://localhost:6130/api/health"
check_url "EZBill API" "http://localhost:6120/api/health"
check_url "GreenPulse API" "http://localhost:6160/api/health"
check_url "EZStart API" "http://localhost:6100/api/health"

echo ""
echo "🌐 Checking Web Apps..."
check_url "EZStart" "http://localhost:6101"
check_url "EZAuth Web" "http://localhost:6111"
check_url "EZBill Web" "http://localhost:6121"
check_url "EZPay Web" "http://localhost:6131"
check_url "FengShui" "http://localhost:6151"
check_url "ASC-TCD" "http://localhost:6141"
check_url "GreenPulse Web" "http://localhost:6161"

echo ""
echo "✅ Health check complete!"
