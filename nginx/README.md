# Nginx Reverse Proxy Configuration

Configuration Nginx pour les 6 APIs déployées sur Oracle Cloud.

## Architecture

```
Internet (HTTPS)
       ↓
   Nginx Proxy (ports 80/443)
       ↓
   Rate Limiting + SSL
       ↓
   Docker Network (bridge)
       ↓
   ├─→ ezauth-api:5010
   ├─→ ezpay-api:5040
   ├─→ ezbill-api:5020
   ├─→ tower-defense-api:5030
   ├─→ green-pulse-api:5070
   └─→ monitoring-api:5000
```

## Fichiers

- **nginx.conf** - Configuration principale
  - 6 server blocks (HTTP → HTTPS redirect)
  - 6 server blocks (HTTPS avec SSL)
  - Rate limiting (10 req/s pour APIs, 5 req/s pour auth)
  - Proxy headers
  - WebSocket support (monitoring)

## Domaines

| Domaine | Backend | Port | Rate Limit |
|---------|---------|------|------------|
| ezauth.ezstart.xyz | ezauth-api | 5010 | 5 req/s |
| ezpay.ezstart.xyz | ezpay-api | 5040 | 10 req/s |
| ezbill.ezstart.xyz | ezbill-api | 5020 | 10 req/s |
| td-api.ezstart.xyz | tower-defense-api | 5030 | 10 req/s |
| greenpulse.ezstart.xyz | green-pulse-api | 5070 | 10 req/s |
| monitoring.ezstart.xyz | monitoring-api | 5000 | 10 req/s |

## SSL/TLS

Certificats Let's Encrypt via Certbot :
- Renouvellement automatique (toutes les 12h)
- TLS 1.2 et 1.3
- Ciphers modernes et sécurisés

**Volumes Docker :**
- `certbot-conf` → `/etc/letsencrypt`
- `certbot-data` → `/var/www/certbot`

## Features

### Rate Limiting

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=5r/s;
```

- **api_limit** : 10 requêtes/seconde (burst 20)
- **auth_limit** : 5 requêtes/seconde (burst 20)

### Proxy Headers

```nginx
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
```

### WebSocket Support (Monitoring API)

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

## Commandes Utiles

### Vérifier la configuration

```bash
docker compose exec nginx nginx -t
```

### Recharger sans downtime

```bash
docker compose exec nginx nginx -s reload
```

### Voir les logs

```bash
docker compose logs -f nginx-proxy
```

### Status des certificats SSL

```bash
docker compose run --rm certbot certificates
```

### Renouveler manuellement les certificats

```bash
docker compose run --rm certbot renew
docker compose restart nginx
```

## Troubleshooting

### 502 Bad Gateway

Backend API non démarrée :
```bash
docker compose ps
docker compose logs ezauth-api  # ou autre API
```

### 504 Gateway Timeout

Augmenter le timeout :
```nginx
proxy_read_timeout 90s;  # déjà configuré
```

### SSL Certificate Errors

Vérifier les certificats :
```bash
docker compose run --rm certbot certificates
```

Réobtenir les certificats :
```bash
./scripts/oracle-init-ssl.sh
```

## Sécurité

- ✅ HTTPS forcé (HTTP → HTTPS redirect)
- ✅ TLS 1.2+ uniquement
- ✅ Ciphers modernes
- ✅ Rate limiting activé
- ✅ Headers sécurisés (X-Real-IP, X-Forwarded-*)
- ✅ Client body size limité (20MB)

## Performance

- ✅ `sendfile on` - Optimise le transfert de fichiers
- ✅ `tcp_nopush on` - Réduit le nombre de paquets
- ✅ `tcp_nodelay on` - Réduit la latence
- ✅ `keepalive_timeout 65` - Connexions persistantes
- ✅ HTTP/2 activé
