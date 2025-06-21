import { cn } from '../../../../lib/utils';
// VARIANTS CONSTRUCTION
//
// Size is a variant used to define the global responsive size of a tag
//
export const sizeContainerCommon = 'w-full';
export const sizeContainer = {
  default: '',
  xs: cn(sizeContainerCommon, 'max-w-2xl gap-1 md:gap-2'),
  sm: cn(sizeContainerCommon, 'max-w-3xl gap-1 md:gap-2'),
  md: cn(sizeContainerCommon, 'max-w-4xl gap-2 md:gap-4'),
  lg: cn(sizeContainerCommon, 'max-w-5xl gap-2 md:gap-4'),
  xl: cn(sizeContainerCommon, 'max-w-6xl gap-4 md:gap-6'),
  full: cn(sizeContainerCommon, 'max-w-none gap-4 md:gap-8'),
} as const;
export const sizeTextCommon = 'w-full';
export const sizeText = {
  default: '',
  h1: cn(sizeTextCommon, 'text-3xl sm:text-4xl md:text-5xl'),
  h2: cn(sizeTextCommon, 'text-2xl sm:text-3xl md:text-4xl'),
  h3: cn(sizeTextCommon, 'text-xl sm:text-2xl md:text-3xl'),
  h4: cn(sizeTextCommon, 'text-lg sm:text-xl md:text-2xl'),
  h5: cn(sizeTextCommon, 'text-base sm:text-lg md:text-xl'),
  h6: cn(sizeTextCommon, 'text-sm sm:text-base md:text-lg'),
  giant: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl',
  sm: 'text-sm sm:text-base',
  xs: 'text-xs sm:text-sm',
} as const;

//
// layout is here to define the layout of a tag like position, gird, flex, etc. note the size
//
export const layoutContainerCommon = 'gap-2 mx-auto';
export const layoutContainer = {
  inline: cn(layoutContainerCommon, 'flex flex-row flex-wrap items-center'),
  grid: cn(
    layoutContainerCommon,
    'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
  ),
  col: cn(layoutContainerCommon, 'flex flex-col'),
} as const;
export const layoutTextCommon = 'gap-2';
export const layoutText = {
  inline: cn(layoutTextCommon, 'flex flex-row items-center'),
} as const;
// VARIANTS DESIGN
//
// intent is a variant to change the color of a tag to indicate its status, its not for styling the tag itself
//
export const intentContainer = {
  default: '',
  skeleton:
    'skeleton-shimmer opacity-50 bg-muted text-transparent pointer-events-none',
  success: 'border border-success bg-success/20 text-success-foreground',
  warning: 'border border-warning bg-warning/20 text-warning-foreground',
  danger:
    'border border-destructive bg-destructive/20 text-destructive-foreground',
  info: 'border border-info bg-info/50 text-info-foreground',
  disabled: 'bg-muted text-muted-foreground opacity-50 pointer-events-none',
} as const;

export const intentText = {
  default: '',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
  disabled: 'text-muted opacity-50 pointer-events-none',
} as const;
export const align = {
  center: 'items-center justify-center text-center',
  left: 'items-start justify-start text-left',
  right: 'items-end justify-end text-right',
  between: 'items-center justify-between text-justify',
} as const;
//
// "variant" this is a variant set used to define the global style of a tag
//
export const containerCommonClasses = '';
export const variantContainer = {
  default: '',
  primary: cn(
    containerCommonClasses,
    'bg-primary text-primary-foreground shadow-sm'
  ),
  outline: cn(containerCommonClasses, 'border shadow-sm rounded'),
  card: cn(
    containerCommonClasses,
    'bg-muted border shadow-sm text-card-foreground rounded'
  ),
} as const;

export const textCommonClasses = '';
export const variantText = {
  default: '',
  link: cn(
    textCommonClasses,
    'inline-block mt-4 text-cyan-600 hover:underline cursor-pointer'
  ),
  description: cn(textCommonClasses, 'italic text-muted-foreground font-light'),
} as const;
