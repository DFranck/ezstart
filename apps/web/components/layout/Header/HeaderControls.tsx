// shared elements between headers
import { EzTag } from '@ezstart/ez-tag';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

export function HeaderControls() {
  return (
    <EzTag as='div' className='flex items-center gap-2'>
      <LocaleSwitcher />
      <ThemeSwitcher />
    </EzTag>
  );
}
