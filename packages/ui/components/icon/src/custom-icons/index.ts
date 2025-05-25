import Ezstart from './ezstart';
import Npm from './npm';

export const customIconMap = {
  Ezstart,
  Npm,
} as const;

export type CustomIconName = keyof typeof customIconMap;
