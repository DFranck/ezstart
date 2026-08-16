# auth-sdk — vanilla standalone example

A 3-file browser starter using `@ezstart/auth-sdk/core` directly — zero React, zero framework.

## What it shows

- `index.html` is a single page with a sign-in form and a signed-in view.
- `app.ts` calls `createCoreAuthClient({ apiUrl, appName })` to get a typed
  client with `loginWithCookie`, `logout`, and `getCurrentUser`.
- On page load, the app tries `getCurrentUser()` to detect an existing session
  cookie. The form submits via `loginWithCookie`. The signed-in view shows the
  user object as JSON.

This is the integration level you'd use for a Vue / Svelte / vanilla JS app, a
browser extension, an Electron app, or any non-React frontend.

## Run it

```bash
cp .env.example .env
# Edit .env — point VITE_AUTH_API_URL at a running auth API
npm install
npm run dev
```

Open <http://localhost:5173>.
