// shared elements between headers
import { Tag } from '@ezstart/ui';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

export function HeaderControls() {
  return (
    <Tag as='div' className='flex items-center gap-2'>
      <LocaleSwitcher />
      <ThemeSwitcher />
    </Tag>
  );
}
