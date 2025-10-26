#!/bin/bash

# Script de backup MongoDB Atlas
# À exécuter chaque semaine manuellement (ou via cron)
#
# USAGE:
#   chmod +x scripts/backup-mongodb.sh
#   ./scripts/backup-mongodb.sh

BACKUP_DIR="./backups/$(date +%Y-%m-%d)"
MONGO_URI="mongodb+srv://franckdufournet:KCmY7QOEiFtqI1Du@cluster0.pqlcyyk.mongodb.net"

echo "🔄 Creating backup directory: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

echo "📦 Backing up EZAuth database..."
mongodump --uri="$MONGO_URI/ezauth" --out="$BACKUP_DIR/ezauth"

echo "📦 Backing up EZBilling database..."
mongodump --uri="$MONGO_URI/ezbilling" --out="$BACKUP_DIR/ezbilling"

echo "✅ Backup complete!"
echo "📂 Backups saved in: $BACKUP_DIR"
echo ""
echo "⚠️  IMPORTANT: Copy these backups to an external drive or cloud storage!"
echo "   Don't keep them only on your computer!"
