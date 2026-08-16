# auth-sdk — Next.js minimal example

A 4-file Next.js 15 App Router starter showing the canonical SSR-first auth setup
with `@ezstart/auth-sdk`.

## What it shows

- `app/layout.tsx` calls `getServerAuth()` server-side and forwards `initialUser`
  to the client `<AuthProvider>`. Result: zero login flash on first paint.
- `components/providers.tsx` wires `<ThemeProvider>` + `<AuthProvider>` +
  `<Toaster>` once for the entire app.
- `app/page.tsx` shows a header with `<UserMenu fallback={<LoginButton>...} />`
  that renders the right state on the first frame.
- `app/login/page.tsx` drops in a `<SignInForm>` for the embedded auth pattern.

## Run it

```bash
cp .env.example .env.local
# Edit .env.local — point NEXT_PUBLIC_AUTH_API_URL at a running auth API
npm install
npm run dev
```

Open <http://localhost:3000>.

## Pick a different auth UX

- **Hosted login** (current setup): user clicks `<LoginButton>` → redirected to a
  hosted EZAuth-style page → back to your app with a session.
- **Embedded forms**: delete `<LoginButton>` from `app/page.tsx`, link to
  `/login` instead. The user stays on your domain throughout.

Both patterns are wired by default.
