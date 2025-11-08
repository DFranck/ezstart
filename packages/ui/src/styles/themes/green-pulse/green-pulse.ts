/**
 * Green-pulse Theme CSS
 * Source: packages/ui/src/styles/themes/green-pulse/green-pulse.css
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run `pnpm generate:themes` to regenerate from CSS source
 */
export const greenPulseThemeCss = `/* GreenPulse Theme Variables */

:root {
  /* Primary green for eco/sustainability theme */
  --gp-primary: oklch(0.6 0.18 145);
  --gp-primary-foreground: oklch(0.98 0.01 145);

  /* Secondary colors */
  --gp-secondary: oklch(0.65 0.12 160);
  --gp-secondary-foreground: oklch(0.2 0.05 160);

  /* Generic gradient (green to blue) */
  --gp-gradient-from: oklch(0.6 0.18 145); /* green-600 */
  --gp-gradient-via: oklch(0.65 0.17 160); /* emerald-600 */
  --gp-gradient-to: oklch(0.6 0.15 240); /* blue-600 */
}

.dark {
  /* Primary green for eco/sustainability theme (dark mode) */
  --gp-primary: oklch(0.7 0.2 145);
  --gp-primary-foreground: oklch(0.15 0.05 145);

  /* Secondary colors (dark mode) */
  --gp-secondary: oklch(0.75 0.15 160);
  --gp-secondary-foreground: oklch(0.15 0.05 160);

  /* Generic gradient (dark mode) */
  --gp-gradient-from: oklch(0.35 0.08 145); /* green-900 */
  --gp-gradient-via: oklch(0.3 0.06 160); /* emerald-900 */
  --gp-gradient-to: oklch(0.35 0.08 240); /* blue-900 */
}

@theme inline {
  --color-gp-primary: var(--gp-primary);
  --color-gp-primary-foreground: var(--gp-primary-foreground);
  --color-gp-secondary: var(--gp-secondary);
  --color-gp-secondary-foreground: var(--gp-secondary-foreground);
}

@layer utilities {
  /* GreenPulse Generic Gradient */
  .bg-gp-gradient {
    background: linear-gradient(
      to right,
      var(--gp-gradient-from),
      var(--gp-gradient-via),
      var(--gp-gradient-to)
    );
  }
}
`
