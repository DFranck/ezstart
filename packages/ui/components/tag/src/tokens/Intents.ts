// 🟩 Intent variations for containers (section, main, container...)
export const containerIntents = {
  default: '',
  skeleton: 'animate-pulse bg-skeleton text-skeleton-foreground rounded',
  danger:
    'border border-destructive bg-destructive/20 text-destructive-foreground',
  success: 'border border-success bg-success/20 text-success-foreground',
  warning: 'border border-warning bg-warning/20 text-warning-foreground',
} as const;

// 🟦 Intent variations for text (span, p, label, etc.)
export const textIntents = {
  default: '',
  danger: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
  skeleton: 'text-skeleton-foreground',
} as const;
