## 🚀 Déploiement

### Railway (APIs)

**Build Command Standard :**

```bash
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/api-core build && \
pnpm turbo build --filter=api-[appname]
```

**Start Command :**

```bash
cd apps/[appname]/api && node dist/index.js
```

**Healthcheck :**

```
/api/health
```

### Vercel (Web Apps)

**Configuration Vercel Dashboard :**

- ✅ Root Directory : `apps/[app]/web`
- ✅ Include files outside root directory : COCHÉ
- ✅ Build Command : `pnpm build`
- ✅ Framework : Next.js

**vercel.json obligatoire :**

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "installCommand": "pnpm install --frozen-lockfile"
}
```
