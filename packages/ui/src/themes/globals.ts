/**
 * Global Theme CSS
 * Source: packages/ui/src/styles/globals.css
 *
 * This contains the base design system colors used across all apps.
 * Extract only the CSS variables, not the full globals.css
 */
export const globalThemeCss = `/* Global Design System Variables */

:root {
  /* Base colors */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);

  /* Card */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);

  /* Popover */
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* Primary */
  --primary: oklch(0.253 0.015 285.82);
  --primary-foreground: oklch(0.985 0 0);

  /* Secondary */
  --secondary: oklch(0.961 0 0);
  --secondary-foreground: oklch(0.145 0 0);

  /* Muted */
  --muted: oklch(0.961 0 0);
  --muted-foreground: oklch(0.455 0.002 285.75);

  /* Accent */
  --accent: oklch(0.961 0 0);
  --accent-foreground: oklch(0.145 0 0);

  /* Destructive */
  --destructive: oklch(0.577 0.245 27.33);
  --destructive-foreground: oklch(0.985 0 0);

  /* Border */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.253 0.015 285.82);

  /* Chart colors */
  --chart-1: oklch(0.632 0.258 20.6);
  --chart-2: oklch(0.705 0.16 163.23);
  --chart-3: oklch(0.548 0.189 241.92);
  --chart-4: oklch(0.763 0.178 72.65);
  --chart-5: oklch(0.718 0.167 51.8);
}

.dark {
  /* Base colors (dark) */
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);

  /* Card (dark) */
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);

  /* Popover (dark) */
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);

  /* Primary (dark) */
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.253 0.015 285.82);

  /* Secondary (dark) */
  --secondary: oklch(0.215 0.009 285.94);
  --secondary-foreground: oklch(0.985 0 0);

  /* Muted (dark) */
  --muted: oklch(0.215 0.009 285.94);
  --muted-foreground: oklch(0.637 0.004 286.07);

  /* Accent (dark) */
  --accent: oklch(0.215 0.009 285.94);
  --accent-foreground: oklch(0.985 0 0);

  /* Destructive (dark) */
  --destructive: oklch(0.627 0.221 25.01);
  --destructive-foreground: oklch(0.985 0 0);

  /* Border (dark) */
  --border: oklch(0.215 0.009 285.94);
  --input: oklch(0.215 0.009 285.94);
  --ring: oklch(0.278 0.017 285.88);

  /* Chart colors (dark) */
  --chart-1: oklch(0.809 0.126 70.08);
  --chart-2: oklch(0.723 0.174 162.48);
  --chart-3: oklch(0.692 0.16 241.02);
  --chart-4: oklch(0.859 0.143 99.26);
  --chart-5: oklch(0.833 0.148 58.72);
}`
