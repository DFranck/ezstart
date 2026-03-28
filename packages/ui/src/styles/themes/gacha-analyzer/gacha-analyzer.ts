/**
 * Game Analyzer Theme CSS
 * Source: packages/ui/src/styles/themes/gacha-analyzer/gacha-analyzer.css
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run `pnpm generate:themes` to regenerate from CSS source
 */
export const gameAnalyzerThemeCss = `/* ============================
   Game Analyzer Theme
   SW-inspired roll quality colors
   ============================ */

:root {
  /* Roll quality colors (SW system) */
  --ga-roll-legend: oklch(0.75 0.18 55);       /* orange/doré - Legend quality */
  --ga-roll-legend-foreground: oklch(0.98 0.01 55);
  --ga-roll-hero: oklch(0.6 0.2 290);          /* violet - Hero quality */
  --ga-roll-hero-foreground: oklch(0.98 0.01 290);
  --ga-roll-rare: oklch(0.65 0.18 240);        /* bleu - Rare quality */
  --ga-roll-rare-foreground: oklch(0.98 0.01 240);
  --ga-roll-magic: oklch(0.7 0.18 145);        /* vert - Magic quality */
  --ga-roll-magic-foreground: oklch(0.98 0.01 145);
  --ga-roll-normal: oklch(0.6 0.02 0);         /* gris - Normal quality */
  --ga-roll-normal-foreground: oklch(0.98 0.01 0);

  /* Tier colors */
  --ga-tier-godlike: oklch(0.75 0.18 55);      /* orange/doré */
  --ga-tier-great: oklch(0.6 0.2 290);         /* violet */
  --ga-tier-good: oklch(0.65 0.18 240);        /* bleu */
  --ga-tier-keep: oklch(0.7 0.02 0);           /* gris neutre */
  --ga-tier-sell: oklch(0.65 0.22 25);         /* rouge */

  /* Element colors (pour les monstres) */
  --ga-element-fire: oklch(0.65 0.22 25);
  --ga-element-water: oklch(0.65 0.18 240);
  --ga-element-wind: oklch(0.7 0.18 145);
  --ga-element-light: oklch(0.85 0.15 85);
  --ga-element-dark: oklch(0.5 0.18 290);

  /* Rune background (pour les masques en mode scan) */
  --ga-rune-bg: oklch(0.25 0.04 55);
}

.dark {
  --ga-roll-legend: oklch(0.8 0.2 55);
  --ga-roll-hero: oklch(0.7 0.22 290);
  --ga-roll-rare: oklch(0.72 0.2 240);
  --ga-roll-magic: oklch(0.75 0.2 145);
  --ga-roll-normal: oklch(0.65 0.02 0);

  --ga-tier-godlike: oklch(0.8 0.2 55);
  --ga-tier-great: oklch(0.7 0.22 290);
  --ga-tier-good: oklch(0.72 0.2 240);
  --ga-tier-keep: oklch(0.75 0.02 0);
  --ga-tier-sell: oklch(0.7 0.24 25);

  --ga-element-fire: oklch(0.7 0.24 25);
  --ga-element-water: oklch(0.72 0.2 240);
  --ga-element-wind: oklch(0.75 0.2 145);
  --ga-element-light: oklch(0.9 0.12 85);
  --ga-element-dark: oklch(0.6 0.2 290);

  --ga-rune-bg: oklch(0.2 0.03 55);
}

@theme inline {
  --color-ga-roll-legend: var(--ga-roll-legend);
  --color-ga-roll-legend-foreground: var(--ga-roll-legend-foreground);
  --color-ga-roll-hero: var(--ga-roll-hero);
  --color-ga-roll-hero-foreground: var(--ga-roll-hero-foreground);
  --color-ga-roll-rare: var(--ga-roll-rare);
  --color-ga-roll-rare-foreground: var(--ga-roll-rare-foreground);
  --color-ga-roll-magic: var(--ga-roll-magic);
  --color-ga-roll-magic-foreground: var(--ga-roll-magic-foreground);
  --color-ga-roll-normal: var(--ga-roll-normal);
  --color-ga-roll-normal-foreground: var(--ga-roll-normal-foreground);

  --color-ga-tier-godlike: var(--ga-tier-godlike);
  --color-ga-tier-great: var(--ga-tier-great);
  --color-ga-tier-good: var(--ga-tier-good);
  --color-ga-tier-keep: var(--ga-tier-keep);
  --color-ga-tier-sell: var(--ga-tier-sell);

  --color-ga-element-fire: var(--ga-element-fire);
  --color-ga-element-water: var(--ga-element-water);
  --color-ga-element-wind: var(--ga-element-wind);
  --color-ga-element-light: var(--ga-element-light);
  --color-ga-element-dark: var(--ga-element-dark);

  --color-ga-rune-bg: var(--ga-rune-bg);
}
`
