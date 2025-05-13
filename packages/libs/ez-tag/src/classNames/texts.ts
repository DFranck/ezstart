import { twJoin } from 'tailwind-merge';

export const textClasses = {
  p: twJoin('text-base leading-relaxed'),
  span: '',
  // ajoute ici d’autres inline si besoin
} as const;
