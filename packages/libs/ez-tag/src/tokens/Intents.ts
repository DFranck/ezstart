// 🟩 Intent variations for containers (section, main, container...)
export const containerIntents = {
  default: '',
  skeleton: 'animate-pulse bg-gray-200 text-transparent rounded',
  danger: 'border border-red-300 bg-red-100 text-red-800',
  success: 'border border-green-300 bg-green-100 text-green-800',
  warning: 'border border-yellow-300 bg-yellow-100 text-yellow-800',
} as const;

// 🟦 Intent variations for text (span, p, label, etc.)
export const textIntents = {
  default: '',
  danger: 'text-red-600',
  success: 'text-green-600',
  warning: 'text-yellow-700',
  muted: 'text-gray-400',
} as const;

// 🟧 Intent variations for controls (buttons, input, select, etc.)
export const controlIntents = {
  default: '',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  success:
    'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
  warning:
    'bg-yellow-500 text-white hover:bg-yellow-600 focus-visible:ring-yellow-500',
} as const;

export type ContainerIntent = keyof typeof containerIntents;
export type TextIntent = keyof typeof textIntents;
export type ControlIntent = keyof typeof controlIntents;
