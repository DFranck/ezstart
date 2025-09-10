#!/bin/bash

echo "🚀 Déploiement de Tower Defense PWA sur Vercel..."

# Vérifier que Vercel CLI est installé
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI n'est pas installé. Installation..."
    npm install -g vercel
fi

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: package.json non trouvé. Assurez-vous d'être dans le répertoire de la PWA."
    exit 1
fi

# Générer les icônes PWA
echo "🔄 Génération des icônes PWA..."
pnpm generate-icons

# Build de production
echo "🔨 Build de production..."
pnpm build

# Déploiement sur Vercel
echo "📤 Déploiement sur Vercel..."
vercel --prod

echo "✅ Déploiement terminé !"
echo "🌐 Votre PWA est maintenant accessible sur Vercel !"