// shared elements between headers
import { LocaleSwitcher } from './local-switcher';
import { ThemeSwitcher } from './theme-switcher';

export function HeaderControls() {
  return (
    <div className='flex items-center gap-2'>
      <LocaleSwitcher />
      <ThemeSwitcher />
    </div>
  );
}
