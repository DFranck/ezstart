// packages/libs/ez-icon/src/types/icon.ts
import type { LucideProps } from 'lucide-react';

/** Tous les noms d’icônes fournis par lucide-react */
import * as lucide from 'lucide-react';
import * as fa from 'react-icons/fa';

const customIcons = [] as const;
export const lucideIcons = Object.keys(lucide) as (keyof typeof lucide)[];
export const faIcons = Object.keys(fa) as (keyof typeof fa)[];

export type KnownIconName =
  | `lucide:${keyof typeof lucide}`
  | `fa:${keyof typeof fa}`
  | `custom:${(typeof customIcons)[number]}`;

/**
 * Props de base de ton wrapper :
 * - size, color, strokeWidth, etc. viennent de LucideProps
 * - spin + rotate sont tes ajouts
 */
export interface EzIconProps extends LucideProps {
  name: KnownIconName;
  /** Animation de rotation continue */
  spin?: boolean;
  /** Angle de rotation en degrés */
  rotate?: number;
}
