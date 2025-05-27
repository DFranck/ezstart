import { cn } from '../../../../lib/utils';

// 🟩 Visual variations for containers (section, main, etc.)
export const containerCommonClasses = 'rounded-md';

export const containerVariants = {
  default: '',
  primary: cn(
    containerCommonClasses,
    'bg-primary text-primary-foreground p-2 shadow-sm'
  ),
  outline: cn(containerCommonClasses, 'border p-2 shadow-sm'),
  card: cn(containerCommonClasses, 'bg-muted border p-2 shadow-sm'),
} as const;

// 🟦 Visual variations for texts (span, p, label, etc.)
export const textCommonClasses = '';
export const textVariants = {
  default: '',
  link: cn(textCommonClasses, 'underline text-primary '),
} as const;
