import * as lucide from 'lucide-react';
import * as fa from 'react-icons/fa';
import { customIconMap } from './custom-icons';

export const lucideIconNames = new Set(Object.keys(lucide));
export const faIconNames = new Set(Object.keys(fa));
export type CustomIconName = keyof typeof customIconMap;

export type KnownIconName =
  | `lucide:${keyof typeof lucide}`
  | `fa:${keyof typeof fa}`
  | `custom:${CustomIconName}`;

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: KnownIconName;
  spin?: boolean;
  rotate?: number;
  size?: number;
  /** Enable fade-in animation when icon loads (default: true) */
  animate?: boolean;
  /** Animation duration in ms (default: 200) */
  animateDuration?: number;
  /** ARIA label for screen readers (required for semantic icons) */
  ariaLabel?: string;
  /** Hide icon from screen readers (for decorative icons) */
  ariaHidden?: boolean;
  /** ARIA role (default: 'img' for semantic icons, undefined for decorative) */
  ariaRole?: string;
  /** Title for icon tooltip */
  title?: string;
}
