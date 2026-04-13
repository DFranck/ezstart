/**
 * Ezstart Theme CSS
 * Source: packages/ui/src/styles/themes/ezstart/ezstart.css
 *
 * ⚠️ AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run `pnpm generate:themes` to regenerate from CSS source
 */
export const ezstartThemeCss = `/* EZStart Theme Variables */

:root[data-app='ezstart'] {
  /* Override shadcn primary/secondary/accent tokens */
  --primary: oklch(0.5413 0.2466 293.01);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.95 0.03 293);
  --secondary-foreground: oklch(0.3 0.1 293);
  --accent: oklch(0.93 0.04 293);
  --accent-foreground: oklch(0.3 0.1 293);

  --ezstart: oklch(0.5413 0.2466 293.01);

  /* Monitoring - Status Colors */
  --status-healthy: oklch(0.75 0.17 145); /* Green - Service operational */
  --status-healthy-foreground: oklch(0.2 0.08 145);
  --status-degraded: oklch(0.75 0.18 80); /* Orange/Amber - Partial issues */
  --status-degraded-foreground: oklch(0.25 0.09 80);
  --status-unhealthy: oklch(0.65 0.22 25); /* Red - Service down */
  --status-unhealthy-foreground: oklch(0.22 0.11 25);
  --status-unknown: oklch(0.68 0.05 250); /* Gray - No data */
  --status-unknown-foreground: oklch(0.4 0.02 250);

  /* Monitoring - Platform Colors */
  --platform-railway: oklch(0.45 0.13 290); /* Purple - Railway brand */
  --platform-railway-foreground: oklch(0.98 0.01 290);
  --platform-render: oklch(0.55 0.15 240); /* Blue - Render brand */
  --platform-render-foreground: oklch(0.98 0.01 240);
  --platform-vercel: oklch(0.2 0 0); /* Black - Vercel brand */
  --platform-vercel-foreground: oklch(0.98 0 0);
}

:root[data-app='ezstart'].dark {
  /* Override shadcn primary/secondary/accent tokens */
  --primary: oklch(0.6513 0.2466 293.01);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.25 0.05 293);
  --secondary-foreground: oklch(0.95 0.02 293);
  --accent: oklch(0.28 0.06 293);
  --accent-foreground: oklch(0.95 0.02 293);

  --ezstart: oklch(0.5413 0.2466 293.01);

  /* Monitoring - Status Colors (Dark Mode) */
  --status-healthy: oklch(0.754 0.184 146); /* Brighter green for dark */
  --status-healthy-foreground: oklch(0.98 0.01 145);
  --status-degraded: oklch(0.723 0.174 75); /* Brighter orange for dark */
  --status-degraded-foreground: oklch(0.98 0.01 75);
  --status-unhealthy: oklch(0.627 0.221 25); /* Brighter red for dark */
  --status-unhealthy-foreground: oklch(0.98 0.01 25);
  --status-unknown: oklch(0.6 0.05 250); /* Lighter gray for dark */
  --status-unknown-foreground: oklch(0.9 0.02 250);

  /* Monitoring - Platform Colors (Dark Mode) */
  --platform-railway: oklch(0.65 0.19 290); /* Brighter purple for dark */
  --platform-railway-foreground: oklch(0.98 0.01 290);
  --platform-render: oklch(0.7 0.18 240); /* Brighter blue for dark */
  --platform-render-foreground: oklch(0.98 0.01 240);
  --platform-vercel: oklch(0.98 0 0); /* White for dark mode */
  --platform-vercel-foreground: oklch(0.2 0 0);
}

@theme inline {
  --color-ezstart: var(--ezstart);

  /* Monitoring - Status Colors */
  --color-status-healthy: var(--status-healthy);
  --color-status-healthy-foreground: var(--status-healthy-foreground);
  --color-status-degraded: var(--status-degraded);
  --color-status-degraded-foreground: var(--status-degraded-foreground);
  --color-status-unhealthy: var(--status-unhealthy);
  --color-status-unhealthy-foreground: var(--status-unhealthy-foreground);
  --color-status-unknown: var(--status-unknown);
  --color-status-unknown-foreground: var(--status-unknown-foreground);

  /* Monitoring - Platform Colors */
  --color-platform-railway: var(--platform-railway);
  --color-platform-railway-foreground: var(--platform-railway-foreground);
  --color-platform-render: var(--platform-render);
  --color-platform-render-foreground: var(--platform-render-foreground);
  --color-platform-vercel: var(--platform-vercel);
  --color-platform-vercel-foreground: var(--platform-vercel-foreground);
}
`
