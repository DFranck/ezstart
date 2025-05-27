// shared elements between headers
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeSwitcher } from './ThemeSwitcher';

export function HeaderControls() {
  return (
    <div className='flex items-center gap-2'>
      <LocaleSwitcher />
      <ThemeSwitcher />
    </div>
  );
}
