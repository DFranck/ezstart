# ☁️ Oracle Cloud - Quick Start Guide

Guide rapide pour déployer les 6 APIs sur Oracle Cloud Free Tier.

**Documentation complète :** [docs/ORACLE-CLOUD-DEPLOY.md](./docs/ORACLE-CLOUD-DEPLOY.md)

---

## 🎯 Résumé

**Coût : GRATUIT À VIE**
- 6 APIs sur 1 seule VM
- 4 CPU ARM + 24GB RAM
- SSL/TLS automatique
- 0ms cold start

---

## ⚡ Déploiement en 5 Minutes

### 1️⃣ Créer un Compte Oracle Cloud

1. Aller sur https://www.oracle.com/cloud/free/
2. S'inscrire (carte requise mais jamais facturée)
3. Activer le compte

### 2️⃣ Créer une VM

**Dashboard → Compute → Instances → Create Instance**

Configuration :
- **Name:** `ezstart-apis`
- **Image:** Ubuntu 22.04 (ARM)
- **Shape:** VM.Standard.A1.Flex
  - OCPU: 4
  - Memory: 24 GB
- **Network:** Créer nouveau VCN public
- **SSH:** Générer + télécharger la clé

**Ouvrir les ports (Security List) :**
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)

### 3️⃣ Configurer DNS

Dans votre registrar (ex: Cloudflare), créer 6 enregistrements A :

```
ezauth.ezstart.xyz       → <ORACLE_VM_IP>
ezpay.ezstart.xyz        → <ORACLE_VM_IP>
ezbill.ezstart.xyz       → <ORACLE_VM_IP>
td-api.ezstart.xyz       → <ORACLE_VM_IP>
greenpulse.ezstart.xyz   → <ORACLE_VM_IP>
monitoring.ezstart.xyz   → <ORACLE_VM_IP>
```

### 4️⃣ Se Connecter à la VM

```bash
chmod 400 ~/Downloads/ssh-key.key
ssh -i ~/Downloads/ssh-key.key ubuntu@<ORACLE_VM_IP>
```

### 5️⃣ Installer Docker

```bash
# Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu
sudo apt install docker-compose-plugin -y

# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Redémarrer la session
exit
ssh -i ~/Downloads/ssh-key.key ubuntu@<ORACLE_VM_IP>
```

### 6️⃣ Déployer les APIs

```bash
# Cloner
git clone https://github.com/DFranck/ezstart.git
cd ezstart

# Configurer .env
cp .env.oracle.example .env
nano .env  # Remplir avec vos valeurs

# Déployer
./scripts/oracle-deploy.sh

# Vérifier
./scripts/oracle-health.sh
```

### 7️⃣ Configurer SSL (après propagation DNS)

```bash
./scripts/oracle-init-ssl.sh
```

---

## 🛠️ Scripts de Gestion

```bash
# Santé des APIs
./scripts/oracle-health.sh

# Logs
./scripts/oracle-logs.sh all          # Tous
./scripts/oracle-logs.sh ezauth       # Une API

# Mise à jour
./scripts/oracle-update.sh

# Docker manuel
docker compose ps                     # Status
docker compose logs -f ezauth-api     # Logs
docker compose restart ezauth-api     # Restart
docker stats                          # Ressources
```

---

## 🔧 Configuration Vercel (Apps Web)

Mettre à jour les variables d'environnement :

**EZAuth Web :**
```env
NEXT_PUBLIC_EZAUTH_API_URL=https://ezauth.ezstart.xyz/api/auth
```

**EZPay Web :**
```env
NEXT_PUBLIC_API_URL=https://ezpay.ezstart.xyz/api
```

**EZBill Web :**
```env
NEXT_PUBLIC_API_URL=https://ezbill.ezstart.xyz/api
```

**Tower Defense Web :**
```env
NEXT_PUBLIC_API_URL=https://td-api.ezstart.xyz/api
```

**GreenPulse Web :**
```env
NEXT_PUBLIC_API_URL=https://greenpulse.ezstart.xyz/api
```

**Monitoring (EZStart Web) :**
```env
NEXT_PUBLIC_MONITORING_API_URL=https://monitoring.ezstart.xyz/api
```

Puis redéployer les apps Vercel.

---

## ✅ Checklist Complète

- [ ] Compte Oracle créé
- [ ] VM créée (4 OCPU, 24GB RAM)
- [ ] Ports ouverts (22, 80, 443)
- [ ] DNS configurés (6 domaines)
- [ ] DNS propagés (vérifier avec `nslookup`)
- [ ] SSH key sauvegardée
- [ ] Docker installé
- [ ] Repository cloné
- [ ] .env configuré
- [ ] APIs déployées (`oracle-deploy.sh`)
- [ ] Health checks OK (`oracle-health.sh`)
- [ ] SSL configuré (`oracle-init-ssl.sh`)
- [ ] Variables Vercel mises à jour
- [ ] Apps Vercel redéployées
- [ ] Tests end-to-end OK

---

## 🚨 Troubleshooting

**Build lent :**
```bash
# Builder 1 par 1
docker compose build ezauth-api
docker compose build ezpay-api
# etc.
```

**Container ne démarre pas :**
```bash
docker compose logs ezauth-api
# Vérifier MONGO_URL dans .env
```

**SSL fail :**
```bash
# Vérifier DNS
nslookup ezauth.ezstart.xyz

# Réessayer
./scripts/oracle-init-ssl.sh
```

---

## 📚 Documentation

- **Guide complet :** [docs/ORACLE-CLOUD-DEPLOY.md](./docs/ORACLE-CLOUD-DEPLOY.md) (20 pages)
- **Vue d'ensemble :** [DEPLOY.md](./DEPLOY.md)
- **Configuration locale :** [CLAUDE.md](./CLAUDE.md)

---

## 💰 Coût Final

**Oracle Cloud Free Tier :** $0/mois (GRATUIT À VIE)

**Inclus :**
- ✅ 2x VM ARM (on utilise 1)
- ✅ 4 OCPU ARM Ampere
- ✅ 24GB RAM
- ✅ 200GB Storage
- ✅ 10TB/mois bande passante
- ✅ Pas de sleep mode
- ✅ Pas de cold start

**Économies vs ancien setup :**
- Railway : $2-4/mois → $0
- Render : Limitations sleep mode → Aucune
- **Total : ~$50/an économisés**

---

🎉 **Félicitations ! Vos 6 APIs sont maintenant déployées gratuitement sur Oracle Cloud !**
