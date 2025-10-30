# 🚀 Migration vers Oracle Cloud - Récapitulatif

**Date :** 30 Octobre 2025
**Objectif :** Migrer les 6 APIs de Railway/Render vers Oracle Cloud Free Tier

---

## 📦 Fichiers Créés

### Configuration Docker

| Fichier | Description |
|---------|-------------|
| [docker-compose.yml](./docker-compose.yml) | Orchestration des 6 APIs + Nginx + Certbot |
| [.dockerignore](./.dockerignore) | Exclusions Docker globales |
| [.env.oracle.example](./.env.oracle.example) | Template variables d'environnement |

### Dockerfiles APIs (6 total)

| API | Dockerfile | .dockerignore |
|-----|------------|---------------|
| EZAuth | [apps/ezauth/api/Dockerfile](./apps/ezauth/api/Dockerfile) | ✅ Existant |
| EZPay | [apps/ezpay/api/Dockerfile](./apps/ezpay/api/Dockerfile) | ✅ Existant |
| EZBill | [apps/ezbill/api/Dockerfile](./apps/ezbill/api/Dockerfile) | [apps/ezbill/api/.dockerignore](./apps/ezbill/api/.dockerignore) |
| Tower Defense | [apps/tower-defense/api/Dockerfile](./apps/tower-defense/api/Dockerfile) | [apps/tower-defense/api/.dockerignore](./apps/tower-defense/api/.dockerignore) |
| GreenPulse | [apps/green-pulse/api/Dockerfile](./apps/green-pulse/api/Dockerfile) | [apps/green-pulse/api/.dockerignore](./apps/green-pulse/api/.dockerignore) |
| Monitoring | [apps/ezstart/api/Dockerfile](./apps/ezstart/api/Dockerfile) | [apps/ezstart/api/.dockerignore](./apps/ezstart/api/.dockerignore) |

**Optimisations Dockerfiles :**
- Multi-stage build (base, deps, builder, runner)
- Image finale optimisée (Node Alpine)
- Healthchecks intégrés
- Compilation des dépendances workspace

### Configuration Nginx

| Fichier | Description |
|---------|-------------|
| [nginx/nginx.conf](./nginx/nginx.conf) | Reverse proxy + SSL + Rate limiting |
| [nginx/README.md](./nginx/README.md) | Documentation Nginx |

**Features Nginx :**
- 6 domaines configurés
- HTTP → HTTPS redirect
- SSL/TLS (Let's Encrypt)
- Rate limiting (5-10 req/s)
- WebSocket support (monitoring)
- Proxy headers sécurisés

### Scripts de Gestion (5 scripts)

| Script | Description |
|--------|-------------|
| [scripts/oracle-deploy.sh](./scripts/oracle-deploy.sh) | Déploiement initial des APIs |
| [scripts/oracle-init-ssl.sh](./scripts/oracle-init-ssl.sh) | Configuration SSL (Let's Encrypt) |
| [scripts/oracle-update.sh](./scripts/oracle-update.sh) | Mise à jour rolling (zero downtime) |
| [scripts/oracle-health.sh](./scripts/oracle-health.sh) | Vérification santé + ressources |
| [scripts/oracle-logs.sh](./scripts/oracle-logs.sh) | Consultation logs simplifiée |

### Documentation

| Document | Description |
|----------|-------------|
| [docs/ORACLE-CLOUD-DEPLOY.md](./docs/ORACLE-CLOUD-DEPLOY.md) | Guide complet (20 pages) |
| [ORACLE-QUICK-START.md](./ORACLE-QUICK-START.md) | Guide rapide (5 min) |
| [DEPLOY.md](./DEPLOY.md) | Mis à jour avec section Oracle |
| [CLAUDE.md](./CLAUDE.md) | Mis à jour avec liens Oracle |
| [MIGRATION-ORACLE.md](./MIGRATION-ORACLE.md) | Ce fichier |

---

## 🎯 Avantages de la Migration

### Coûts

| Avant | Après | Économie |
|-------|-------|----------|
| Railway: $2-4/mois | Oracle: $0/mois | $24-48/an |
| Render: Sleep mode | Oracle: 0ms cold start | Meilleure UX |
| Limitations resources | 24GB RAM, 4 CPU | Haute performance |

### Performance

| Métrique | Avant | Après |
|----------|-------|-------|
| Cold Start | 0ms (Railway) / 30s (Render) | 0ms (toujours actif) |
| RAM/API | 512MB | ~3-4GB disponible |
| CPU | 1 vCPU partagé | 4 ARM cores |
| Storage | 512MB-100GB | 200GB total |
| Bande passante | 100GB/mois | 10TB/mois |

### Gestion

| Aspect | Avant | Après |
|--------|-------|-------|
| Plateformes | Railway + Render (2) | Oracle (1) |
| Configuration | Séparée par API | docker-compose.yml |
| SSL | Auto (Railway) / Manuel (Render) | Let's Encrypt auto |
| Logs | Dashboards séparés | Centralisés (Docker) |
| Mise à jour | Par API individuelle | Script automatisé |

---

## 📋 Checklist Migration

### Phase 1: Préparation (Fait ✅)

- [x] Dockerfiles créés (6 APIs)
- [x] docker-compose.yml configuré
- [x] nginx.conf configuré
- [x] Scripts de gestion créés (5)
- [x] Documentation complète
- [x] .env.oracle.example créé
- [x] Tests locaux (optionnel)

### Phase 2: Oracle Cloud Setup

- [ ] Créer compte Oracle Cloud
- [ ] Créer VM (4 OCPU, 24GB RAM)
- [ ] Configurer firewall (ports 22, 80, 443)
- [ ] Télécharger SSH key

### Phase 3: Configuration DNS

- [ ] Créer 6 enregistrements A :
  - ezauth.ezstart.xyz
  - ezpay.ezstart.xyz
  - ezbill.ezstart.xyz
  - td-api.ezstart.xyz
  - greenpulse.ezstart.xyz
  - monitoring.ezstart.xyz
- [ ] Vérifier propagation DNS

### Phase 4: Déploiement VM

- [ ] Se connecter en SSH
- [ ] Installer Docker + Docker Compose
- [ ] Configurer UFW (firewall Ubuntu)
- [ ] Cloner le repository
- [ ] Créer .env avec secrets
- [ ] Exécuter `oracle-deploy.sh`
- [ ] Vérifier healthchecks

### Phase 5: SSL Configuration

- [ ] Attendre propagation DNS complète
- [ ] Exécuter `oracle-init-ssl.sh`
- [ ] Vérifier HTTPS fonctionnel

### Phase 6: Update Apps Web

- [ ] Mettre à jour variables Vercel (6 apps)
- [ ] Redéployer apps Vercel
- [ ] Tester end-to-end

### Phase 7: Cleanup Ancien Setup

- [ ] Arrêter services Railway (après validation)
- [ ] Arrêter services Render (après validation)
- [ ] Conserver railway.toml et render.yaml (documentation)

---

## 🚀 Commandes Rapides

### Déploiement Initial

```bash
# Sur la VM Oracle
./scripts/oracle-deploy.sh
./scripts/oracle-init-ssl.sh
./scripts/oracle-health.sh
```

### Gestion Quotidienne

```bash
# Status
./scripts/oracle-health.sh

# Logs
./scripts/oracle-logs.sh all
./scripts/oracle-logs.sh ezauth

# Mise à jour
git pull
./scripts/oracle-update.sh
```

### Docker Manuel

```bash
# Status
docker compose ps
docker stats

# Logs
docker compose logs -f
docker compose logs -f ezauth-api

# Restart
docker compose restart
docker compose restart ezauth-api

# Rebuild
docker compose build --parallel
docker compose up -d
```

---

## 🔗 Références

**Documentation :**
- [Guide complet Oracle](./docs/ORACLE-CLOUD-DEPLOY.md)
- [Quick Start](./ORACLE-QUICK-START.md)
- [Vue d'ensemble](./DEPLOY.md)
- [Config locale](./CLAUDE.md)

**Ressources Externes :**
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Let's Encrypt](https://letsencrypt.org/)
- [Nginx Docs](https://nginx.org/en/docs/)

---

## 💡 Notes Importantes

### Sécurité

1. ⚠️ **Ne JAMAIS commiter .env** (contient secrets)
2. ✅ Toujours utiliser `.env.oracle.example` comme template
3. ✅ SSH key bien sauvegardée (impossible à récupérer)
4. ✅ UFW firewall activé sur la VM

### Backup

1. ✅ MongoDB sur Atlas (backup automatique)
2. ⚠️ Créer backup manuel de .env sur la VM
3. ⚠️ Sauvegarder SSH key localement
4. ✅ Code sur GitHub (backup automatique)

### Monitoring

1. ✅ Healthchecks Docker intégrés
2. ✅ Nginx logs disponibles
3. ✅ Monitoring API pour health checks externes
4. ⚠️ Configurer alertes email (Phase 3 roadmap)

---

## 🎉 Conclusion

**Migration prête à déployer !**

Tous les fichiers de configuration sont créés et documentés.
Suivre le guide [ORACLE-QUICK-START.md](./ORACLE-QUICK-START.md) pour déployer en 5 minutes.

**Économies annuelles estimées :** $24-48/an + Meilleure performance

**Temps de migration estimé :** 30-60 minutes (première fois)
