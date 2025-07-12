import { customIconMap } from '../custom-icons';
import { faIconNames, lucideIconNames, type KnownIconName } from '../types';

export function isValidIconName(name: string): name is KnownIconName {
  if (name.startsWith('lucide:')) {
    const key = name.slice(7);
    return lucideIconNames.has(key);
  }

  if (name.startsWith('fa:')) {
    const key = name.slice(3);
    return faIconNames.has(key);
  }

  if (name.startsWith('custom:')) {
    const key = name.slice(7);
    return key in customIconMap;
  }

  return false;
}
