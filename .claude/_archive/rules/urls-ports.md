## 🌍 URLs, Ports et Environnements

### Single Source of Truth : @ezstart/config

**TOUJOURS** utiliser `@ezstart/config` pour URLs et ports :

```typescript
import { getApiUrl, getWebUrl, getApiPort } from '@ezstart/config'

// Web app - obtenir URL API
const API_URL = getApiUrl('ezpay')
// Dev: http://localhost:6130
// Prod: https://ezpay-api.up.railway.app

// API - obtenir port
const PORT = getApiPort('ezauth') // 6110

// SEO - domaine production
const domain = getWebUrl('ezpay', 'production')
// https://ezpay.ezstart.xyz
```

### Pattern des Ports (61xx)

| Pattern | Usage         | Exemples                                      |
| ------- | ------------- | --------------------------------------------- |
| `6XX0`  | APIs          | EZAuth 6110, EZBill 6120, EZPay 6130, GP 6160 |
| `6XX1`  | Web Apps      | EZAuth 6111, EZBill 6121, EZPay 6131, GP 6161 |
| `6100`  | EZStart API   | Port fixe                                     |
| `6101`  | EZStart (hub) | Port fixe                                     |

### CORS Automatique

**APIs : JAMAIS hardcoder les CORS origins**

```typescript
// ❌ MAUVAIS
app.use(cors({
  origin: ['http://localhost:6111', 'http://localhost:6121', ...],
  credentials: true
}))

// ✅ BON
import { createApp } from '@ezstart/express-core'
const app = createApp({ apiApp: 'ezauth' })
// CORS auto-configuré avec TOUTES les apps qui appellent ezauth
```
