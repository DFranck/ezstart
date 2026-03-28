# OCR Test Results — Gacha Analyzer

Tracking OCR accuracy improvements over time.

## Test Environment
- **OCR Engine** : Tesseract.js 5.x + Gemini Vision fallback
- **Preprocessing** : Upscale 2x (winner of A/B tests)
- **Game** : Summoners War (PC, Steam)
- **Capture** : getDisplayMedia + ROI zoom

## Preprocessing A/B Tests (2026-03-23)

| Test | Config | Confidence | SPD | ATK | Legend |
|------|--------|-----------|-----|-----|--------|
| 1 | Raw (none) | 58% | ✗ | ✗ | ✗ |
| 2 | Grayscale only | 68% | ✓ | ✓ | ✓ |
| 3 | Contrast 1.5x | 66% | ✓ | ✓ | ✓ |
| 4 | Binarize only | 50% | ✓ | ✗ | ✓ |
| **5** | **Upscale 2x** | **79%** | ✓ | ✓ | ✓ |
| 6 | Upscale 2x + Gray | 77% | ✓ | ✓ | ✓ |
| 7 | Upscale 2x + Contrast | 76% | ✓ | ✓ | ✓ |

**Winner : Upscale 2x alone (79% confidence)**

## Audit Results (2026-03-23)

### Batch 1 — 5 runes (pre-fix)
| Rune | Set | Slot | Substats | Confidence | Issues |
|------|-----|------|----------|-----------|--------|
| 1 | Swift | 1 | 4/4 | 75% | Roll quality % wrong |
| 2 | Violent | 1 | 2/4 | 61% | Missing 2 substats |
| 3 | Revenge | 1 | 4/4 | 75% | Roll quality % wrong |
| 4 | Despair | 1 | 4/4 | 68% | OK |
| 5 | Energy | 1 | 4/4 | 72% | OK |

**Score : 3/5 fully correct (60%)**

### Batch 2 — 6 runes (post parser+engine fixes)
| Rune | Set | Slot | Substats | Confidence | Issues |
|------|-----|------|----------|-----------|--------|
| 1 | Violent | 1 | 4/4 | 65% | Quality undefined |
| 2 | Despair | 2 | 4/4 | 77% | ✅ SPD main stat correct |
| 3 | Endure | 3 | 3/4 | 80% | Partial=true ✅, missing 1 sub |
| 4 | Endure | 4 | 4/4 | 73% | ✅ HP% main stat correct |
| 5 | Accuracy | 5 | 4/4 | 79% | ✅ HP main stat correct |
| 6 | Endure | 6 | 4/4 | 78% | ❌ ATK flat as main (slot 6 bug) |

**Score : 4/6 fully correct (67%)**

### Batch 3 — 6 runes (post audit fixes + Gemini fallback)
*To be tested after current fixes*

## Known Issues
- Slot 6 main stat defaults to ATK flat when OCR can't read the real main stat
- Quality (Legend/Hero) not always detected
- Gemini fallback doesn't trigger for partial=true when confidence > 70%

## Improvement Roadmap
- [ ] Fix slot 6 main stat
- [ ] Gemini fallback for partial results
- [ ] Better quality detection (Legend/Hero fuzzy matching)
- [ ] Consider Gemini as primary OCR (free tier 1500 req/day)
- [ ] AI cascade system in @ezstart/ai-sdk
