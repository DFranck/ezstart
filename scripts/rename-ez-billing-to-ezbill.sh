#!/bin/bash
# Script de migration : ez-billing → ezbill
# ⚠️ ATTENTION : Faire un backup avant d'exécuter !

set -e  # Stop on error

echo "🔄 Migration ez-billing → ezbill"
echo "=================================="
echo ""
echo "⚠️  Ce script va :"
echo "  1. Renommer le dossier apps/ez-billing → apps/ezbill"
echo "  2. Mettre à jour tous les package.json"
echo "  3. Mettre à jour les imports TypeScript"
echo "  4. Mettre à jour la documentation"
echo ""
read -p "Continuer ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Migration annulée"
    exit 1
fi

echo ""
echo "📦 Étape 1/6 : Renommage du dossier (git mv)"
git mv apps/ez-billing apps/ezbill

echo ""
echo "📝 Étape 2/6 : Mise à jour des package.json"

# apps/ezbill/api/package.json
sed -i 's/"name": "api-ez-billing"/"name": "api-ezbill"/g' apps/ezbill/api/package.json
sed -i 's/"@ez-billing\/types"/"@ezbill\/types"/g' apps/ezbill/api/package.json

# apps/ezbill/web/package.json
sed -i 's/"name": "web-ez-billing"/"name": "web-ezbill"/g' apps/ezbill/web/package.json
sed -i 's/"@ez-billing\/types"/"@ezbill\/types"/g' apps/ezbill/web/package.json

# apps/ezbill/types/package.json
sed -i 's/"name": "@ez-billing\/types"/"name": "@ezbill\/types"/g' apps/ezbill/types/package.json

# package.json root (scripts dev)
sed -i 's/web-ez-billing/web-ezbill/g' package.json
sed -i 's/api-ez-billing/api-ezbill/g' package.json
sed -i 's/ez-billing/ezbill/g' package.json

# tsconfig.json root (references)
sed -i 's/ez-billing/ezbill/g' tsconfig.json

echo ""
echo "🔍 Étape 3/6 : Mise à jour des imports TypeScript"

# Trouver tous les fichiers .ts et .tsx qui importent @ez-billing/types
find apps/ezbill -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i 's/@ez-billing\/types/@ezbill\/types/g' {} \;

echo ""
echo "📚 Étape 4/6 : Mise à jour de la documentation"

# CLAUDE.md
sed -i 's/ez-billing/ezbill/g' CLAUDE.md
sed -i 's/EZ-Billing/EZBill/g' CLAUDE.md

# DEPLOY.md
sed -i 's/ez-billing/ezbill/g' DEPLOY.md
sed -i 's/EZ-Billing/EZBill/g' DEPLOY.md

# Messages i18n (ezstart, asc-tcd)
find apps/ezstart/web/src/messages -type f -name "*.json" -exec sed -i 's/ez-billing/ezbill/g' {} \;
find apps/asc-tcd/web/src/messages -type f -name "*.json" -exec sed -i 's/ez-billing/ezbill/g' {} \;

echo ""
echo "🗑️  Étape 5/6 : Nettoyage du cache"
rm -rf node_modules/.cache
rm -rf .turbo
rm -rf apps/ezbill/api/node_modules
rm -rf apps/ezbill/web/node_modules
rm -rf apps/ezbill/types/node_modules

echo ""
echo "📦 Étape 6/6 : Réinstallation des dépendances"
pnpm install

echo ""
echo "✅ Migration terminée !"
echo ""
echo "📋 Actions manuelles restantes :"
echo "  1. Vérifier sur Vercel :"
echo "     - Renommer projet 'ez-billing-web' → 'ezbill-web'"
echo "     - Mettre à jour Root Directory : apps/ezbill/web"
echo ""
echo "  2. Vérifier les URLs de déploiement"
echo ""
echo "  3. Tester la compilation :"
echo "     pnpm turbo build --filter=api-ezbill"
echo "     pnpm turbo build --filter=web-ezbill"
echo ""
echo "  4. Commit les changements :"
echo "     git add ."
echo "     git commit -m 'refactor: rename ez-billing to ezbill'"
echo ""
