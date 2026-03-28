# Gacha Analyzer - Game Screenshot Scanner (OCR)

Analyse de screenshots de jeux mobiles via OCR pour extraire les stats d'items (runes, gear).

## Architecture

```
apps/gacha-analyzer/
├── api/              # Express API (Port 5080)
├── web/              # Next.js Frontend (Port 5085)
└── types/            # Types partagés (@gacha-analyzer/types)
```

## Quick Start

```bash
# Depuis la racine du monorepo
pnpm dev:ga
```

## Ports

| Service | Port |
|---------|------|
| API     | 5080 |
| Web     | 5085 |

## API Endpoints

| Methode  | Route             | Description               |
|----------|-------------------|---------------------------|
| `POST`   | `/api/scan`       | Scanner une image (OCR)   |
| `GET`    | `/api/scans`      | Lister les scans          |
| `GET`    | `/api/scans/:id`  | Detailler un scan         |
| `DELETE` | `/api/scans/:id`  | Supprimer un scan         |

## Jeux Supportes

| Jeu              | Type OCR | Donnees extraites                         |
|------------------|----------|-------------------------------------------|
| Summoners War    | Runes    | Set, slot, grade, level, stats principales/secondaires |
| Nikke            | Gear     | Type, manufacturer, tier, level, stats     |

## Types

```ts
// Scan
type ScanStatus = 'pending' | 'processing' | 'completed' | 'failed'
interface ScanResult { success, data (RuneData | GearData), rawText, confidence, processingTimeMs }

// Summoners War
interface RuneData { set, slot, grade, level, mainStat, subStats, innateStat? }

// Nikke
interface GearData { type, manufacturer, level, tier, mainStat, subStats }
```

## Stack

- **API:** Express, Mongoose, Multer, Zod, `@ezstart/ocr-sdk` (Tesseract.js)
- **Web:** Next.js 15, React 19, next-intl, TanStack Query, Zustand, Tailwind
- **Shared:** `@ezstart/auth-sdk`, `@ezstart/ui`, `@ezstart/config`
