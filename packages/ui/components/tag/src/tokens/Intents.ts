// 🟩 Intent variations for containers (section, main, container...)
export const containerIntents = {
  default: '',
  skeleton: 'animate-pulse bg-skeleton text-skeleton-foreground rounded',
  danger:
    'border border-destructive bg-destructive/20 text-destructive-foreground',
  success: 'border border-success bg-success/20 text-success-foreground',
  muted: 'border border-muted bg-muted/20 text-muted-foreground',
  warning: 'border border-warning bg-warning/20 text-warning-foreground',
} as const;

// 🟦 Intent variations for text (span, p, label, etc.)
export const textIntents = {
  default: '',
  danger: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
  muted: 'text-muted-foreground',
  skeleton: 'text-skeleton-foreground',
} as const;

// 🟧 Intent variations for controls (buttons, input, select, etc.)
export const controlIntents = {
  default: '',
  danger:
    'bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive',
  success:
    'bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success',
  warning:
    'bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning',
  muted:
    'bg-muted text-muted-foreground hover:bg-muted/90 focus-visible:ring-muted',
  skeleton: 'bg-skeleton text-skeleton-foreground animate-pulse',
} as const;
