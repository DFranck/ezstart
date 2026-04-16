# GreenPulse

AI-powered ESG/sustainability platform for Vietnamese SMEs.

## Purpose

Helps small and medium enterprises in Vietnam manage environmental compliance through AI-assisted form generation, ESG analysis, project tracking, and chat-based guidance.

## Tech Stack

- **Web:** Next.js, next-intl (vi/en/fr), React Query, @ezstart/ui
- **API:** Express via @ezstart/api-core, MongoDB, @ezstart/ai-sdk
- **Deploy:** Vercel (web) + Railway (API)

## Architecture

```
green-pulse/
├── web/          # Next.js frontend (port 6161)
├── api/          # Express API (port 6160)
│   └── routes/   # chat, esg, forms, projects, theme, upload, webhooks, workspaces
├── types/        # Shared types
└── config/       # Shared config
```

## Setup

```bash
cp api/.env.example api/.env.local
cp web/.env.example web/.env.local
pnpm dev gp
```

## Key Features

- AI chat assistant for ESG guidance
- Dynamic environmental form generation
- Project and workspace management
- ESG report analysis and scoring
- File upload and document processing

## Related

- [@ezstart/ai-sdk](../../packages/ai-sdk) — AI chat and provider abstraction
- [@ezstart/auth-sdk](../../packages/auth-sdk) — SSO authentication
- [FORMS.md](./FORMS.md) — Form system documentation
