'use client'

import DashboardPageNew from './page-new'
import DashboardPageOld from './page-old'
import { Button, Icon } from '@ezstart/ui/components'
import { useState } from 'react'

/**
 * DASHBOARD ROUTER - Switch between old and new versions
 *
 * Toggle between:
 * - NEW (Default): DashboardTabs + GroupedSection (organized with accordions)
 * - OLD: DashboardSection (flat list)
 *
 * Click the floating button in top-right to switch versions!
 */
const DashboardPage = () => {
  const [useNewVersion, setUseNewVersion] = useState(true)

  return (
    <div className="relative">
      {/* Version Switcher - Fixed in top-right corner */}
      <div className="fixed top-20 right-4 z-50">
        <Button
          onClick={() => setUseNewVersion(!useNewVersion)}
          className="bg-primary/90 hover:bg-primary text-primary-foreground shadow-xl backdrop-blur-sm"
          size="sm"
        >
          <Icon name={useNewVersion ? 'lucide:List' : 'lucide:LayoutGrid'} className="w-4 h-4 mr-2" />
          {useNewVersion ? 'Switch to OLD' : 'Switch to NEW'}
        </Button>
      </div>

      {/* Render selected version */}
      {useNewVersion ? <DashboardPageNew /> : <DashboardPageOld />}
    </div>
  )
}

export default DashboardPage
