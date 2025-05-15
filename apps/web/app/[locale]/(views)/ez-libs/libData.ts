// packages/web/lib/data/libData.ts

import EzIconPage from './[lib]/EzIconPage';
import EzTagPage from './[lib]/EzTagPage';

export const libData = {
  'ez-tag': {
    name: 'EzTag',
    description:
      "EzTag is a React component library that provides a set of reusable components for building user interfaces. It's using TailwindCSS.",
    href: '/ez-libs/ez-tag',
    github:
      'https://github.com/DFranck/ezstart/tree/master/packages/libs/ez-tag',
    npm: 'https://www.npmjs.com/package/@ezstart/ez-tag',
    component: EzTagPage,
  },
  'ez-icon': {
    name: 'EzIcon',
    description:
      'EzIcon is a React icon library that provides a customizable set of icons from lucide.dev and other sources.',
    href: '/ez-libs/ez-icon',
    github:
      'https://github.com/DFranck/ezstart/tree/master/packages/libs/ez-icon',
    npm: '',
    component: EzIconPage,
  },
} as const;

export type LibId = keyof typeof libData;
export type LibMeta = (typeof libData)[LibId];
