// shared elements between headers
import { LocaleSwitcher } from './local-switcher'
import { ThemeSwitcher } from './theme-switcher'
import { Div } from '@ezstart/ui/components'

export function HeaderControls() {
  return (
    <Div className="flex items-center gap-2">
      <LocaleSwitcher />
      <ThemeSwitcher />
    </Div>
  )
}
