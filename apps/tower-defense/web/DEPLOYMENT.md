# 🚀 Déploiement Tower Defense PWA sur Vercel

## 📋 Prérequis

- Compte Vercel (gratuit) : [vercel.com](https://vercel.com)
- Vercel CLI installé : `npm install -g vercel`
- Repository GitHub connecté à Vercel

## 🔧 Configuration

### 1. Installation de Vercel CLI
```bash
npm install -g vercel
```

### 2. Connexion à Vercel
```bash
vercel login
```

### 3. Configuration du projet
```bash
cd apps/tower-defense/pwa
vercel
```

## 🚀 Déploiement

### Option 1: Déploiement automatique (recommandé)
1. Connectez votre repository GitHub à Vercel
2. Vercel déploiera automatiquement à chaque push sur `main`
3. Les déploiements preview seront créés pour chaque PR

### Option 2: Déploiement manuel
```bash
# Dans le répertoire de la PWA
cd apps/tower-defense/pwa

# Déploiement de production
pnpm deploy:vercel

# Ou avec le script complet
pnpm deploy
```

### Option 3: Déploiement via GitHub Actions
Le déploiement se fait automatiquement via Vercel GitHub integration.

## 🌐 URLs de déploiement

- **Production** : `https://tower-defense-pwa.vercel.app`
- **Preview** : `https://tower-defense-pwa-git-[branch].vercel.app`
- **Development** : `https://tower-defense-pwa-git-dev.vercel.app`

## 📱 Test de la PWA

### 1. Vérification du manifest
- Ouvrez `https://tower-defense-pwa.vercel.app/manifest.json`
- Vérifiez que le JSON est valide

### 2. Test d'installation
- **Android** : Chrome → Menu → "Ajouter à l'écran d'accueil"
- **iOS** : Safari → Partager → "Sur l'écran d'accueil"
- **Desktop** : Chrome → Icône d'installation dans la barre d'adresse

### 3. Test Lighthouse
```bash
# Installer Lighthouse CLI
npm install -g lighthouse

# Tester la PWA
lighthouse https://tower-defense-pwa.vercel.app --view
```

## 🔧 Variables d'environnement

### Configuration requise
```env
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

### Configuration optionnelle
```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://...
```

## 📊 Monitoring

### Vercel Analytics
- **Performance** : Temps de chargement, Core Web Vitals
- **Erreurs** : Logs d'erreur automatiques
- **Trafic** : Statistiques de visiteurs

### PWA Metrics
- **Installations** : Nombre d'installations PWA
- **Engagement** : Temps passé dans l'app
- **Retention** : Taux de retour des utilisateurs

## 🔄 Mises à jour

### Déploiement automatique
1. Push sur `main` → Déploiement automatique
2. Vercel détecte les changements
3. Build et déploiement en quelques minutes
4. Service Worker met à jour automatiquement

### Rollback
```bash
# Revenir à une version précédente
vercel rollback [deployment-url]
```

## 🛠️ Dépannage

### Erreurs courantes

#### Build échoue
```bash
# Vérifier les logs
vercel logs

# Build local pour tester
pnpm build
```

#### PWA ne s'installe pas
- Vérifier HTTPS (automatique sur Vercel)
- Vérifier le manifest.json
- Tester avec Lighthouse

#### Service Worker ne fonctionne pas
- Vérifier les headers de cache
- Vider le cache du navigateur
- Vérifier les logs Vercel

### Support
- **Vercel Support** : [vercel.com/support](https://vercel.com/support)
- **Documentation** : [vercel.com/docs](https://vercel.com/docs)
- **Community** : [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

## 📈 Optimisations

### Performance
- ✅ Images optimisées avec Next.js Image
- ✅ Code splitting automatique
- ✅ Cache intelligent avec Service Worker
- ✅ Compression gzip/brotli automatique

### SEO
- ✅ Métadonnées PWA complètes
- ✅ Open Graph tags
- ✅ Twitter Cards
- ✅ Sitemap automatique

### Sécurité
- ✅ Headers de sécurité configurés
- ✅ HTTPS automatique
- ✅ CSP headers
- ✅ HSTS activé

---

**🎯 Votre PWA Tower Defense est maintenant prête pour le déploiement sur Vercel !**