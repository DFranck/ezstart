// packages/libs/ez-icon/src/types/icon.ts
import type * as Lucide from 'lucide-react';
import type { LucideProps } from 'lucide-react';

/** Tous les noms d’icônes fournis par lucide-react */
export type IconName = keyof typeof Lucide;

/**
 * Props de base de ton wrapper :
 * - size, color, strokeWidth, etc. viennent de LucideProps
 * - spin + rotate sont tes ajouts
 */
export interface EzIconProps extends LucideProps {
  name: IconName;
  /** Animation de rotation continue */
  spin?: boolean;
  /** Angle de rotation en degrés */
  rotate?: number;
}
