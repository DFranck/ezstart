/**
 * GreenPulse Theme CSS
 * Source: packages/ui/src/styles/themes/green-pulse.css
 *
 * This is the SINGLE SOURCE OF TRUTH for GreenPulse theme colors.
 * Any changes should be made in the CSS file, not here.
 */
export const greenPulseThemeCss = `/* GreenPulse Theme Variables */

:root {
  /* Primary green for eco/sustainability theme */
  --green-pulse-primary: oklch(0.6 0.18 145);
  --green-pulse-primary-foreground: oklch(0.98 0.01 145);

  /* Accent colors */
  --green-pulse-accent: oklch(0.55 0.15 140);
  --green-pulse-accent-foreground: oklch(0.98 0.01 140);

  /* Secondary colors */
  --green-pulse-secondary: oklch(0.65 0.12 160);
  --green-pulse-secondary-foreground: oklch(0.2 0.05 160);
}

.dark {
  /* Primary green for eco/sustainability theme (dark mode) */
  --green-pulse-primary: oklch(0.7 0.2 145);
  --green-pulse-primary-foreground: oklch(0.15 0.05 145);

  /* Accent colors (dark mode) */
  --green-pulse-accent: oklch(0.65 0.18 140);
  --green-pulse-accent-foreground: oklch(0.15 0.05 140);

  /* Secondary colors (dark mode) */
  --green-pulse-secondary: oklch(0.75 0.15 160);
  --green-pulse-secondary-foreground: oklch(0.15 0.05 160);
}`
