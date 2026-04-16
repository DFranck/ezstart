# Gacha Analyzer

Game screenshot scanner that extracts and analyzes item stats via OCR.

## Purpose

Lets players scan screenshots of in-game items (runes, gear) to extract stats, evaluate quality, and track inventory. Supports Summoners War and Nikke.

## Tech Stack

- **Web:** Next.js, next-intl, React Query, @ezstart/ui
- **API:** Express via @ezstart/api-core, MongoDB, @ezstart/ocr-sdk
- **Deploy:** Vercel (web) + Railway (API)

## Architecture

```
gacha-analyzer/
├── web/          # Scanner UI (port 6171)
├── api/          # OCR + analysis API (port 6170)
│   └── routes/   # scan-image, get-scans, game-config, feedback, reanalyze
├── types/        # Shared types (game-specific models)
└── config/       # Shared config
```

## Setup

```bash
cp api/.env.example api/.env.local
cp web/.env.example web/.env.local
pnpm dev ga
```

## Key Features

- Screenshot OCR scanning with zone-based extraction
- Game-specific stat parsing and quality analysis
- Scan history and re-analysis
- User feedback loop for OCR accuracy improvement
- Configurable game profiles

## Related

- [@ezstart/ocr-sdk](../../packages/ocr-sdk) — OCR engine and preprocessing
- [@ezstart/auth-sdk](../../packages/auth-sdk) — SSO authentication
