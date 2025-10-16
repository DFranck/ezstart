#!/bin/bash

# Script pour ajouter automatiquement les fichiers SEO à une app
# Usage: ./scripts/add-seo.sh ezauth

APP=$1

if [ -z "$APP" ]; then
  echo "Usage: ./scripts/add-seo.sh <app-name>"
  echo "Example: ./scripts/add-seo.sh ezauth"
  exit 1
fi

APP_DIR="apps/$APP/web/src/app"

if [ ! -d "$APP_DIR" ]; then
  echo "❌ App directory not found: $APP_DIR"
  exit 1
fi

# Mapping des domaines
declare -A DOMAINS=(
  ["ezstart"]="https://ezstart-web.vercel.app"
  ["ezauth"]="https://ezauth.vercel.app"
  ["ezbill"]="https://ezbill-web.vercel.app"
  ["ezpay"]="https://ezpay.vercel.app"
  ["fengshui"]="https://fengshui-web.vercel.app"
  ["tower-defense"]="https://tower-defense-web.vercel.app"
  ["asc-tcd"]="https://asc-tcd-web.vercel.app"
  ["green-pulse"]="https://green-pulse-web.vercel.app"
)

DOMAIN="${DOMAINS[$APP]}"

if [ -z "$DOMAIN" ]; then
  echo "❌ Unknown app: $APP"
  exit 1
fi

echo "🚀 Adding SEO files to $APP ($DOMAIN)"

# 1. Créer robots.ts
echo "📝 Creating robots.ts..."
cat > "$APP_DIR/robots.ts" << EOF
import { createRobots } from '@ezstart/seo-config/robots'

export default function robots() {
  return createRobots({
    domain: '$DOMAIN',
  })
}
EOF

# 2. Créer sitemap.ts
echo "📝 Creating sitemap.ts..."
cat > "$APP_DIR/sitemap.ts" << EOF
import { createSitemap } from '@ezstart/seo-config/sitemap'

export default function sitemap() {
  return createSitemap({
    domain: '$DOMAIN',
    routes: ['/'],
  })
}
EOF

# 3. Ajouter le package dans package.json si pas déjà présent
PACKAGE_JSON="apps/$APP/web/package.json"
if ! grep -q "@ezstart/seo-config" "$PACKAGE_JSON"; then
  echo "📦 Adding @ezstart/seo-config to package.json..."
  # On laisse l'utilisateur le faire manuellement pour éviter les erreurs JSON
  echo "⚠️  N'oublie pas d'ajouter dans package.json:"
  echo '   "@ezstart/seo-config": "workspace:*"'
fi

echo "✅ SEO files created for $APP!"
echo ""
echo "Next steps:"
echo "1. Update layout.tsx to use createMetadata()"
echo "2. Add @ezstart/seo-config to package.json if not done"
echo "3. Run: pnpm install"
