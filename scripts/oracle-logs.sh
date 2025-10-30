#!/bin/bash
# Oracle Cloud - View API Logs
# Helper script to view logs of specific APIs

# Show menu if no argument provided
if [ -z "$1" ]; then
  echo "📋 Available APIs:"
  echo "   1. ezauth     - EZAuth API"
  echo "   2. ezpay      - EZPay API"
  echo "   3. ezbill     - EZBill API"
  echo "   4. td         - Tower Defense API"
  echo "   5. gp         - GreenPulse API"
  echo "   6. monitoring - Monitoring API"
  echo "   7. nginx      - Nginx Proxy"
  echo "   8. all        - All containers"
  echo ""
  read -p "Select API (1-8): " choice

  case $choice in
    1) SERVICE="ezauth-api" ;;
    2) SERVICE="ezpay-api" ;;
    3) SERVICE="ezbill-api" ;;
    4) SERVICE="tower-defense-api" ;;
    5) SERVICE="green-pulse-api" ;;
    6) SERVICE="monitoring-api" ;;
    7) SERVICE="nginx-proxy" ;;
    8) SERVICE="" ;;
    *) echo "Invalid choice"; exit 1 ;;
  esac
else
  # Map short names to service names
  case $1 in
    ezauth) SERVICE="ezauth-api" ;;
    ezpay) SERVICE="ezpay-api" ;;
    ezbill) SERVICE="ezbill-api" ;;
    td) SERVICE="tower-defense-api" ;;
    gp) SERVICE="green-pulse-api" ;;
    monitoring) SERVICE="monitoring-api" ;;
    nginx) SERVICE="nginx-proxy" ;;
    all) SERVICE="" ;;
    *) SERVICE="$1" ;;
  esac
fi

# Show logs
if [ -z "$SERVICE" ]; then
  echo "📋 Showing logs for all containers (press Ctrl+C to exit)..."
  docker compose logs -f --tail=100
else
  echo "📋 Showing logs for $SERVICE (press Ctrl+C to exit)..."
  docker compose logs -f --tail=100 $SERVICE
fi
