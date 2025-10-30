# 🚀 Migration Oracle Cloud Free Tier - @ezstart APIs

## 📋 Vue d'Ensemble

Oracle Cloud Infrastructure (OCI) offre un **Free Tier permanent** beaucoup plus généreux que Railway/Render :

### Comparaison des Plans Gratuits

| Ressources | Oracle Cloud Free | Railway Free | Render Free |
|-----------|-------------------|--------------|-------------|
| **Compute** | 2x VM ARM (4 cores, 24GB RAM) | $1/mois crédit | 1 service |
| **RAM** | 24GB total | 512MB/service | 512MB |
| **CPU** | 4 ARM cores | 1 vCPU | Shared |
| **Storage** | 200GB block storage | 100GB | 512MB |
| **Network** | 10TB/mois | 100GB | 100GB |
| **Cold Start** | 0ms (toujours actif) | 0ms | ~30s |
| **Sleep Mode** | Jamais | Jamais | Après 15min |
| **Cost** | **GRATUIT** | $1/mois | $0 (1 service) |

### APIs à Migrer (6 total)

**Actuellement sur Railway (2) :**
1. EZAuth API (Port 5010) - SSO critique
2. EZPay API (Port 5040) - Paiements Stripe

**Actuellement sur Render (4) :**
3. EZBill API (Port 5020) - Facturation
4. Tower Defense API (Port 5030) - Jeu
5. GreenPulse API (Port 5070) - Formulaires AI
6. Monitoring API (Port 5080) - Health checks

---

## 🎯 Stratégie de Déploiement

### Option 1: VM Unique avec Docker Compose (RECOMMANDÉ)

**Architecture :**
```
Oracle Cloud VM (ARM)
├── Nginx Reverse Proxy (ports 80/443)
│   ├── ezauth.ezstart.xyz → localhost:5010
│   ├── ezpay.ezstart.xyz → localhost:5040
│   ├── ezbill.ezstart.xyz → localhost:5020
│   ├── td-api.ezstart.xyz → localhost:5030
│   ├── greenpulse.ezstart.xyz → localhost:5070
│   └── monitoring.ezstart.xyz → localhost:5080
│
└── Docker Compose
    ├── ezauth-api (container)
    ├── ezpay-api (container)
    ├── ezbill-api (container)
    ├── tower-defense-api (container)
    ├── green-pulse-api (container)
    └── monitoring-api (container)
```

**Avantages :**
- ✅ Simple à gérer (1 seule VM)
- ✅ Ressources partagées optimales (24GB RAM pour 6 APIs)
- ✅ SSL/TLS centralisé (Let's Encrypt)
- ✅ Logs centralisés

**Ressources par API :**
- Mémoire: ~1-2GB chacune (largement suffisant)
- CPU: Shared 4 cores ARM (excellent pour Node.js)
- Storage: 20GB par container (120GB total)

---

## 📦 Phase 1: Configuration Locale Docker

### Étape 1.1: Créer les Dockerfiles

Chaque API aura son propre Dockerfile optimisé.

**Structure :**
```
apps/
├── ezauth/api/
│   ├── Dockerfile          ← À créer
│   └── .dockerignore       ← À créer
├── ezpay/api/
│   ├── Dockerfile
│   └── .dockerignore
...
```

**Template Dockerfile (Node.js API) :**
```dockerfile
# Multi-stage build pour optimiser la taille
FROM node:20-alpine AS base
RUN npm install -g pnpm@10.12.2
WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY apps/ezauth/api/package.json ./apps/ezauth/api/
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Stage 2: Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
RUN pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build && \
    pnpm turbo build --filter=api-ezauth

# Stage 3: Production
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files
COPY --from=builder /app/apps/ezauth/api/dist ./dist
COPY --from=builder /app/apps/ezauth/api/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 5010
CMD ["node", "dist/index.js"]
```

### Étape 1.2: Créer docker-compose.yml

**À la racine du monorepo :**
```yaml
version: '3.8'

services:
  # ======================
  # EZAuth API (SSO)
  # ======================
  ezauth-api:
    build:
      context: .
      dockerfile: apps/ezauth/api/Dockerfile
    container_name: ezauth-api
    restart: unless-stopped
    ports:
      - "5010:5010"
    environment:
      - NODE_ENV=production
      - PORT=5010
      - MONGO_URL=${EZAUTH_MONGO_URL}
      - JWT_SECRET=${EZAUTH_JWT_SECRET}
      - GOOGLE_CLIENT_ID=${EZAUTH_GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${EZAUTH_GOOGLE_CLIENT_SECRET}
      - GOOGLE_CALLBACK_URL=https://ezauth.ezstart.xyz/api/auth/google/callback
      - ALLOWED_ORIGINS=${EZAUTH_ALLOWED_ORIGINS}
    networks:
      - ezstart-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5010/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ======================
  # EZPay API (Payments)
  # ======================
  ezpay-api:
    build:
      context: .
      dockerfile: apps/ezpay/api/Dockerfile
    container_name: ezpay-api
    restart: unless-stopped
    ports:
      - "5040:5040"
    environment:
      - NODE_ENV=production
      - PORT=5040
      - MONGO_URL=${EZPAY_MONGO_URL}
      - STRIPE_SECRET_KEY=${EZPAY_STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${EZPAY_STRIPE_WEBHOOK_SECRET}
      - WEB_URL=https://ezpay.ezstart.xyz
    networks:
      - ezstart-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5040/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ======================
  # EZBill API (Invoicing)
  # ======================
  ezbill-api:
    build:
      context: .
      dockerfile: apps/ezbill/api/Dockerfile
    container_name: ezbill-api
    restart: unless-stopped
    ports:
      - "5020:5020"
    environment:
      - NODE_ENV=production
      - PORT=5020
      - MONGO_URL=${EZBILL_MONGO_URL}
      - JWT_SECRET=${EZBILL_JWT_SECRET}
    networks:
      - ezstart-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5020/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ======================
  # Tower Defense API (Game)
  # ======================
  tower-defense-api:
    build:
      context: .
      dockerfile: apps/tower-defense/api/Dockerfile
    container_name: tower-defense-api
    restart: unless-stopped
    ports:
      - "5030:5030"
    environment:
      - NODE_ENV=production
      - PORT=5030
      - MONGO_URL=${TD_MONGO_URL}
    networks:
      - ezstart-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5030/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ======================
  # GreenPulse API (AI Forms)
  # ======================
  green-pulse-api:
    build:
      context: .
      dockerfile: apps/green-pulse/api/Dockerfile
    container_name: green-pulse-api
    restart: unless-stopped
    ports:
      - "5070:5070"
    environment:
      - NODE_ENV=production
      - PORT=5070
      - MONGO_URL=${GP_MONGO_URL}
      - GEMINI_API_KEY=${GP_GEMINI_API_KEY}
    networks:
      - ezstart-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5070/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ======================
  # Monitoring API (Health Checks)
  # ======================
  monitoring-api:
    build:
      context: .
      dockerfile: apps/monitoring/api/Dockerfile
    container_name: monitoring-api
    restart: unless-stopped
    ports:
      - "5080:5080"
    environment:
      - NODE_ENV=production
      - PORT=5080
      - MONGO_URL=${MONITORING_MONGO_URL}
      - HEALTH_CHECK_INTERVAL=600000
      - HEALTH_CHECK_TIMEOUT=5000
    networks:
      - ezstart-network
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:5080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # ======================
  # Nginx Reverse Proxy
  # ======================
  nginx:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot-data:/var/www/certbot:ro
      - certbot-conf:/etc/letsencrypt:ro
    depends_on:
      - ezauth-api
      - ezpay-api
      - ezbill-api
      - tower-defense-api
      - green-pulse-api
      - monitoring-api
    networks:
      - ezstart-network

  # ======================
  # Certbot (SSL/TLS)
  # ======================
  certbot:
    image: certbot/certbot
    container_name: certbot
    volumes:
      - certbot-data:/var/www/certbot
      - certbot-conf:/etc/letsencrypt
    command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@example.com --agree-tos --no-eff-email -d ezauth.ezstart.xyz -d ezpay.ezstart.xyz -d ezbill.ezstart.xyz -d td-api.ezstart.xyz -d greenpulse.ezstart.xyz -d monitoring.ezstart.xyz

networks:
  ezstart-network:
    driver: bridge

volumes:
  certbot-data:
  certbot-conf:
```

### Étape 1.3: Configuration Nginx

**Créer nginx/nginx.conf :**
```nginx
events {
    worker_connections 1024;
}

http {
    upstream ezauth {
        server ezauth-api:5010;
    }
    upstream ezpay {
        server ezpay-api:5040;
    }
    upstream ezbill {
        server ezbill-api:5020;
    }
    upstream tower-defense {
        server tower-defense-api:5030;
    }
    upstream green-pulse {
        server green-pulse-api:5070;
    }
    upstream monitoring {
        server monitoring-api:5080;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

    # EZAuth API
    server {
        listen 80;
        server_name ezauth.ezstart.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name ezauth.ezstart.xyz;

        ssl_certificate /etc/letsencrypt/live/ezauth.ezstart.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/ezauth.ezstart.xyz/privkey.pem;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://ezauth;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # EZPay API
    server {
        listen 80;
        server_name ezpay.ezstart.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name ezpay.ezstart.xyz;

        ssl_certificate /etc/letsencrypt/live/ezpay.ezstart.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/ezpay.ezstart.xyz/privkey.pem;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://ezpay;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # EZBill API
    server {
        listen 80;
        server_name ezbill.ezstart.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name ezbill.ezstart.xyz;

        ssl_certificate /etc/letsencrypt/live/ezbill.ezstart.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/ezbill.ezstart.xyz/privkey.pem;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://ezbill;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Tower Defense API
    server {
        listen 80;
        server_name td-api.ezstart.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name td-api.ezstart.xyz;

        ssl_certificate /etc/letsencrypt/live/td-api.ezstart.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/td-api.ezstart.xyz/privkey.pem;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://tower-defense;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # GreenPulse API
    server {
        listen 80;
        server_name greenpulse.ezstart.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name greenpulse.ezstart.xyz;

        ssl_certificate /etc/letsencrypt/live/greenpulse.ezstart.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/greenpulse.ezstart.xyz/privkey.pem;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://green-pulse;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # Monitoring API
    server {
        listen 80;
        server_name monitoring.ezstart.xyz;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$server_name$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name monitoring.ezstart.xyz;

        ssl_certificate /etc/letsencrypt/live/monitoring.ezstart.xyz/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/monitoring.ezstart.xyz/privkey.pem;

        location / {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://monitoring;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

---

## 🔧 Phase 2: Configuration Oracle Cloud

### Étape 2.1: Créer un Compte Oracle Cloud

1. Aller sur https://www.oracle.com/cloud/free/
2. Cliquer "Start for free"
3. Remplir le formulaire (carte bancaire requise mais **JAMAIS facturé**)
4. Vérifier l'email et activer le compte

### Étape 2.2: Créer une VM Instance

**Dans le Dashboard Oracle Cloud :**

1. **Menu → Compute → Instances → Create Instance**

2. **Configuration de base :**
   - Name: `ezstart-apis`
   - Compartment: `root` (ou créer un nouveau)

3. **Image et Shape :**
   - Image: `Ubuntu 22.04 LTS` (Arm-based)
   - Shape: `VM.Standard.A1.Flex`
     - OCPU count: `4` (maximum gratuit)
     - Memory: `24 GB` (maximum gratuit)

4. **Networking :**
   - VCN: Créer nouveau VCN
     - Name: `ezstart-vcn`
     - Subnet: `ezstart-subnet` (public)
   - Assign public IP: ✅ **OUI**

5. **SSH Keys :**
   - Generate SSH key pair
   - **TÉLÉCHARGER** la clé privée (`ssh-key-2024-xx-xx.key`)
   - **SAUVEGARDER** précieusement (impossible à récupérer après)

6. **Boot Volume :**
   - Size: `100 GB` (gratuit jusqu'à 200GB)

7. **Cliquer "Create"**

### Étape 2.3: Configurer le Firewall (Security List)

**Ouvrir les ports nécessaires :**

1. **Menu → Networking → Virtual Cloud Networks**
2. Cliquer sur `ezstart-vcn`
3. Cliquer sur `Security Lists` → `Default Security List`
4. **Add Ingress Rules :**

```
Rule 1: SSH
- Source CIDR: 0.0.0.0/0
- IP Protocol: TCP
- Destination Port: 22

Rule 2: HTTP
- Source CIDR: 0.0.0.0/0
- IP Protocol: TCP
- Destination Port: 80

Rule 3: HTTPS
- Source CIDR: 0.0.0.0/0
- IP Protocol: TCP
- Destination Port: 443
```

---

## 🚀 Phase 3: Déploiement sur Oracle Cloud

### Étape 3.1: Se Connecter à la VM

**Sur votre machine locale :**

```bash
# Donner les permissions à la clé SSH
chmod 400 ~/Downloads/ssh-key-2024-xx-xx.key

# Se connecter (remplacer par l'IP publique de votre VM)
ssh -i ~/Downloads/ssh-key-2024-xx-xx.key ubuntu@<PUBLIC_IP>
```

### Étape 3.2: Installer Docker et Docker Compose

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Ajouter l'utilisateur au groupe docker
sudo usermod -aG docker ubuntu

# Installer Docker Compose
sudo apt install docker-compose-plugin -y

# Vérifier l'installation
docker --version
docker compose version

# Redémarrer la session (déconnexion/reconnexion)
exit
ssh -i ~/Downloads/ssh-key-2024-xx-xx.key ubuntu@<PUBLIC_IP>
```

### Étape 3.3: Configurer le Firewall Ubuntu (UFW)

```bash
# Autoriser les ports nécessaires
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Activer le firewall
sudo ufw enable

# Vérifier le statut
sudo ufw status
```

### Étape 3.4: Cloner le Repository

```bash
# Installer Git
sudo apt install git -y

# Cloner le monorepo (remplacer par votre URL)
git clone https://github.com/DFranck/ezstart.git
cd ezstart
```

### Étape 3.5: Configurer les Variables d'Environnement

**Créer un fichier .env à la racine :**

```bash
# Créer le fichier .env
nano .env
```

**Copier le contenu (à adapter avec vos vraies valeurs) :**

```env
# ======================
# EZAuth API
# ======================
EZAUTH_MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezauth?retryWrites=true&w=majority
EZAUTH_JWT_SECRET=your-production-jwt-secret-change-me
EZAUTH_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
EZAUTH_GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
EZAUTH_ALLOWED_ORIGINS=https://ezauth.vercel.app,https://ezstart-ezbill.vercel.app,https://tower-defense-web.vercel.app,https://ezstart-ezpay.vercel.app

# ======================
# EZPay API
# ======================
EZPAY_MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezpay?retryWrites=true&w=majority
EZPAY_STRIPE_SECRET_KEY=sk_live_xxxxx
EZPAY_STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# ======================
# EZBill API
# ======================
EZBILL_MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/ezbill?retryWrites=true&w=majority
EZBILL_JWT_SECRET=your-ezbill-jwt-secret

# ======================
# Tower Defense API
# ======================
TD_MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/tower-defense?retryWrites=true&w=majority

# ======================
# GreenPulse API
# ======================
GP_MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/green-pulse?retryWrites=true&w=majority
GP_GEMINI_API_KEY=AIzaSyxxxxx

# ======================
# Monitoring API
# ======================
MONITORING_MONGO_URL=mongodb+srv://user:password@cluster.mongodb.net/monitoring?retryWrites=true&w=majority
```

**Sauvegarder : Ctrl+O → Enter → Ctrl+X**

### Étape 3.6: Construire et Démarrer les Containers

```bash
# Builder toutes les images (prend 10-15 min)
docker compose build

# Démarrer tous les services
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps
```

**Output attendu :**
```
NAME                 STATUS              PORTS
ezauth-api           Up 2 minutes       0.0.0.0:5010->5010/tcp
ezpay-api            Up 2 minutes       0.0.0.0:5040->5040/tcp
ezbill-api           Up 2 minutes       0.0.0.0:5020->5020/tcp
tower-defense-api    Up 2 minutes       0.0.0.0:5030->5030/tcp
green-pulse-api      Up 2 minutes       0.0.0.0:5070->5070/tcp
monitoring-api       Up 2 minutes       0.0.0.0:5080->5080/tcp
nginx-proxy          Up 2 minutes       0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
```

### Étape 3.7: Vérifier les Healthchecks

```bash
# Tester chaque API
curl http://localhost:5010/api/health  # EZAuth
curl http://localhost:5040/api/health  # EZPay
curl http://localhost:5020/api/health  # EZBill
curl http://localhost:5030/api/health  # Tower Defense
curl http://localhost:5070/api/health  # GreenPulse
curl http://localhost:5080/api/health  # Monitoring
```

**Output attendu pour chaque :**
```json
{"status":"ok","timestamp":"2025-01-31T..."}
```

---

## 🌐 Phase 4: Configuration DNS et SSL

### Étape 4.1: Configurer les DNS

**Dans votre registrar de domaine (ex: Cloudflare, OVH, etc.) :**

Ajouter ces enregistrements DNS de type **A** :

```
ezauth.ezstart.xyz       → <ORACLE_VM_PUBLIC_IP>
ezpay.ezstart.xyz        → <ORACLE_VM_PUBLIC_IP>
ezbill.ezstart.xyz       → <ORACLE_VM_PUBLIC_IP>
td-api.ezstart.xyz       → <ORACLE_VM_PUBLIC_IP>
greenpulse.ezstart.xyz   → <ORACLE_VM_PUBLIC_IP>
monitoring.ezstart.xyz   → <ORACLE_VM_PUBLIC_IP>
```

**Attendre la propagation DNS (5-30 min) :**

```bash
# Vérifier la propagation
nslookup ezauth.ezstart.xyz
nslookup ezpay.ezstart.xyz
# ... etc
```

### Étape 4.2: Obtenir les Certificats SSL (Let's Encrypt)

**Sur la VM Oracle :**

```bash
# Modifier le docker-compose.yml pour certbot
nano docker-compose.yml

# Dans le service certbot, remplacer "your-email@example.com" par votre email réel

# Obtenir les certificats
docker compose run --rm certbot

# Redémarrer Nginx
docker compose restart nginx
```

**Renouvellement automatique (tous les 3 mois) :**

```bash
# Ajouter un cron job
crontab -e

# Ajouter cette ligne (renouvelle à 2h du matin chaque dimanche)
0 2 * * 0 cd ~/ezstart && docker compose run --rm certbot renew && docker compose restart nginx
```

---

## 🔄 Phase 5: Mettre à Jour les Apps Web Vercel

### Étape 5.1: Mettre à Jour les URLs API

**Pour chaque app web sur Vercel, mettre à jour les variables d'environnement :**

**EZAuth Web :**
```env
# Avant (Railway)
NEXT_PUBLIC_EZAUTH_API_URL=https://ezauth.up.railway.app/api/auth

# Après (Oracle)
NEXT_PUBLIC_EZAUTH_API_URL=https://ezauth.ezstart.xyz/api/auth
```

**EZPay Web :**
```env
# Avant
NEXT_PUBLIC_API_URL=https://ezpay-api.up.railway.app/api

# Après
NEXT_PUBLIC_API_URL=https://ezpay.ezstart.xyz/api
```

**EZBill Web :**
```env
# Avant
NEXT_PUBLIC_API_URL=http://localhost:5020/api

# Après
NEXT_PUBLIC_API_URL=https://ezbill.ezstart.xyz/api
```

### Étape 5.2: Mettre à Jour CORS dans les APIs

**Modifier les ALLOWED_ORIGINS dans .env sur la VM :**

```bash
# Sur la VM Oracle
nano .env

# Ajouter/modifier
EZAUTH_ALLOWED_ORIGINS=https://ezauth.vercel.app,https://ezstart-ezbill.vercel.app,https://tower-defense-web.vercel.app,https://ezstart-ezpay.vercel.app,https://greenpulse.vercel.app

# Redémarrer les containers
docker compose restart
```

---

## 📊 Phase 6: Monitoring et Maintenance

### Commandes Docker Utiles

```bash
# Voir les logs
docker compose logs -f                    # Tous les services
docker compose logs -f ezauth-api         # Un service spécifique
docker compose logs --tail=100 ezauth-api # 100 dernières lignes

# Redémarrer un service
docker compose restart ezauth-api

# Arrêter tous les services
docker compose down

# Démarrer tous les services
docker compose up -d

# Voir l'utilisation des ressources
docker stats

# Nettoyer les images inutilisées
docker system prune -a
```

### Monitoring des Ressources

```bash
# RAM et CPU
htop

# Espace disque
df -h

# Trafic réseau
vnstat -l
```

### Backup Automatique

**Créer un script de backup :**

```bash
# Créer le script
nano ~/backup.sh
```

**Contenu du script :**

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)

# Créer le dossier si inexistant
mkdir -p $BACKUP_DIR

# Backup .env
cp ~/ezstart/.env $BACKUP_DIR/.env_$DATE

# Backup des volumes Docker
docker run --rm -v ezstart_certbot-conf:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/ssl_$DATE.tar.gz /data

echo "Backup completed: $DATE"
```

**Rendre exécutable et automatiser :**

```bash
chmod +x ~/backup.sh

# Cron job (chaque jour à 3h du matin)
crontab -e

# Ajouter
0 3 * * * /home/ubuntu/backup.sh
```

---

## 🎉 Checklist de Migration Complète

### Préparation
- [ ] Compte Oracle Cloud créé
- [ ] VM Instance créée (4 OCPU, 24GB RAM)
- [ ] Firewall Oracle configuré (ports 22, 80, 443)
- [ ] SSH key sauvegardée

### Configuration Locale
- [ ] Dockerfiles créés pour chaque API
- [ ] docker-compose.yml créé
- [ ] nginx.conf créé
- [ ] .dockerignore créés
- [ ] Tests locaux réussis (`docker compose up`)

### Déploiement
- [ ] Connexion SSH à la VM réussie
- [ ] Docker installé
- [ ] Repository cloné
- [ ] .env configuré avec secrets
- [ ] Containers buildés et démarrés
- [ ] Healthchecks OK pour toutes les APIs

### DNS et SSL
- [ ] DNS configurés (6 sous-domaines)
- [ ] Propagation DNS vérifiée
- [ ] Certificats SSL obtenus
- [ ] HTTPS fonctionnel

### Apps Web
- [ ] Variables Vercel mises à jour
- [ ] Redéploiement Vercel effectué
- [ ] Tests des apps web OK
- [ ] CORS configuré

### Monitoring
- [ ] Logs vérifiés
- [ ] Backup automatique configuré
- [ ] Monitoring ressources configuré
- [ ] Renouvellement SSL automatique

---

## 💰 Coût Final

### Oracle Cloud Free Tier (GRATUIT À VIE)

**Inclus gratuitement :**
- ✅ 2x VM ARM (on utilise 1 seule)
- ✅ 4 OCPU
- ✅ 24GB RAM
- ✅ 200GB Storage
- ✅ 10TB/mois bande passante
- ✅ AUCUNE carte bancaire facturée

### Vs. Ancien Setup

**Avant (Railway + Render) :**
- EZAuth API: $1-2/mois (Railway)
- EZPay API: $1-2/mois (Railway)
- EZBill API: Gratuit (Render) mais sleep mode
- Tower Defense: Gratuit (Render) mais sleep mode
- GreenPulse: Gratuit (Render) mais sleep mode
- Monitoring: Gratuit (Render) mais sleep mode
- **Total: $2-4/mois + limitations**

**Après (Oracle Cloud) :**
- Toutes les 6 APIs: **GRATUIT**
- 0ms cold start
- Toujours actif
- **Total: $0/mois + aucune limitation**

---

## 🚨 Troubleshooting

### Build Errors

**Error: Out of memory during build**
```bash
# Solution: Builder 1 par 1
docker compose build ezauth-api
docker compose build ezpay-api
# etc.
```

### Container Fails to Start

**Vérifier les logs :**
```bash
docker compose logs ezauth-api
```

**Erreurs communes :**
- `MONGO_URL undefined` → Vérifier .env
- `Port already in use` → Vérifier `docker compose ps`
- `Connection refused` → Vérifier MongoDB accessible

### SSL Certificate Issues

**Erreur: Failed to obtain certificate**
```bash
# Vérifier que DNS pointe bien vers la VM
nslookup ezauth.ezstart.xyz

# Vérifier que port 80 est ouvert
sudo ufw status

# Réessayer certbot
docker compose run --rm certbot
```

### Performance Issues

**Trop de RAM utilisée :**
```bash
# Vérifier l'utilisation
docker stats

# Redémarrer les containers
docker compose restart
```

---

## 📚 Ressources

- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

**Prochaine étape:** Commencer par la Phase 1 (Configuration Locale Docker) pour tester avant de déployer sur Oracle.