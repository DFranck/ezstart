import type { LucideProps } from 'lucide-react';
import * as lucide from 'lucide-react';
import * as fa from 'react-icons/fa';
import { customIconMap } from './custom-icons';
// src/types/icon.ts
export const lucideIcons = Object.keys(lucide) as (keyof typeof lucide)[];
export const faIcons = Object.keys(fa) as (keyof typeof fa)[];

export type CustomIconName = keyof typeof customIconMap;
export type KnownIconName =
  | `lucide:${keyof typeof lucide}`
  | `fa:${keyof typeof fa}`
  | `custom:${CustomIconName}`;

export interface IconProps extends LucideProps {
  name: KnownIconName;
  spin?: boolean;
  rotate?: number;
}
