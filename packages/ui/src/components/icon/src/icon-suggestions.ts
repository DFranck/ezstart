import * as lucide from 'lucide-react';
import * as fa from 'react-icons/fa';
import { customIconMap } from './custom-icons';
import type { KnownIconName } from './types';

const lucideKeys = Object.keys(lucide);
const faKeys = Object.keys(fa);
const customKeys = Object.keys(customIconMap);

export const iconSuggestions: KnownIconName[] = [
  ...lucideKeys.map((n) => `lucide:${n}` as KnownIconName),
  ...faKeys.map((n) => `fa:${n}` as KnownIconName),
  ...customKeys.map((n) => `custom:${n}` as KnownIconName),
];
