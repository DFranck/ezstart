# Build Commands for Railway & Render

**Updated:** 2025-10-21
**Reason:** Added `@ezstart/logger` dependency to `@ezstart/express-core`

All APIs using `express-core` now need to build `logger` before building `express-core`.

---

## Railway Build Commands

### EZAuth API

```bash
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezauth
```

### EZPay API

```bash
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezpay
```

---

## Render Build Commands

### Monitoring API

```bash
npm install -g pnpm@10.12.2 && \
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-monitoring
```

### EZBill API

```bash
npm install -g pnpm@10.12.2 && \
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-ezbill
```

### Tower Defense API

```bash
npm install -g pnpm@10.12.2 && \
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-tower-defense
```

### GreenPulse API

```bash
npm install -g pnpm@10.12.2 && \
pnpm install --frozen-lockfile --shamefully-hoist && \
pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build && \
pnpm turbo build --filter=api-green-pulse
```

---

## Dependency Order

**Critical:** Build packages in this exact order:

1. `@ezstart/config` (no dependencies)
2. `@ezstart/logger` (no dependencies)
3. `@ezstart/express-core` (depends on config + logger)
4. API app (depends on express-core)

---

## Troubleshooting

### Error: "Cannot find module '@ezstart/logger'"

**Cause:** Build command doesn't include `--filter @ezstart/logger build`

**Fix:** Add `@ezstart/logger` to the build command before `@ezstart/express-core`

### Error: "ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL @ezstart/express-core"

**Cause:** `express-core` can't build because its dependencies aren't built yet

**Fix:** Ensure `config` and `logger` are built first

---

## Vercel Build Commands (Web Apps)

Most web apps don't need custom build commands, but if you use logger in a web app:

### Tower Defense Web

```json
{
  "buildCommand": "pnpm build",
  "scripts": {
    "build": "pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/ui --filter @ezstart/auth-sdk --filter @ezstart/next-theme --filter @tower-defense/types --filter @tower-defense/config --filter @tower-defense/utils build && node src/scripts/generate-pwa-icons.js && next build"
  }
}
```

---

## Quick Reference

| Platform | Install pnpm | Build deps | Build app |
|----------|--------------|------------|-----------|
| Railway | ❌ (pre-installed) | `pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build` | `pnpm turbo build --filter=api-NAME` |
| Render | ✅ `npm install -g pnpm@10.12.2` | `pnpm --filter @ezstart/config --filter @ezstart/logger --filter @ezstart/express-core build` | `pnpm turbo build --filter=api-NAME` |
| Vercel | ❌ (auto) | In package.json `build` script | `next build` |

---

**Note:** Update this file whenever you add a new package dependency to `express-core` or other core packages.
