// shared elements between headers
import { ThemeSwitcher } from '@ezstart/next-theme/components'
import { LocaleSwitcher } from './local-switcher'

export function HeaderControls() {
  return (
    <div className="flex items-center gap-2">
      <LocaleSwitcher />
      <ThemeSwitcher />
    </div>
  )
}
