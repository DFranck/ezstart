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
check_url "EZAuth API" "http://localhost:5010/api/health"
check_url "EZPay API" "http://localhost:5040/api/health"
check_url "EZBill API" "http://localhost:5020/api/health"
check_url "Tower Defense API" "http://localhost:5030/api/health"
check_url "GreenPulse API" "http://localhost:5070/api/health"
check_url "EZStart API" "http://localhost:5000/api/health"

echo ""
echo "🌐 Checking Web Apps..."
check_url "EZStart" "http://localhost:5050"
check_url "EZAuth Web" "http://localhost:5015"
check_url "EZBill Web" "http://localhost:5025"
check_url "EZPay Web" "http://localhost:5045"
check_url "Tower Defense Web" "http://localhost:5035"
check_url "FengShui" "http://localhost:5065"
check_url "ASC-TCD" "http://localhost:5055"
check_url "GreenPulse Web" "http://localhost:5075"

echo ""
echo "✅ Health check complete!"
