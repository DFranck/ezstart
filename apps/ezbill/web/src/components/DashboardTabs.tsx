import { Button, Card, CardContent, Icon, KnownIconName, Tabs, TabsContent, TabsList, TabsTrigger } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { ReactNode } from 'react'

export type TabConfig = {
  id: string
  label: string
  icon: KnownIconName
  iconGradient: string
  content: ReactNode
  count?: number
  actions?: {
    label: string
    icon: KnownIconName
    gradient: string
    onClick: () => void
  }[]
}

type Props = {
  tabs: TabConfig[]
  defaultTab?: string
  className?: string
}

const DashboardTabs = ({ tabs, defaultTab, className }: Props) => {
  return (
    <Card variant="floating" className={cn('', className)}>
      <CardContent className="p-0">
        <Tabs defaultValue={defaultTab || tabs[0]?.id} className="w-full">
          {/* Tabs Header with Icons */}
          <div className="p-4 sm:p-6 border-b border-foreground/10">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
              {tabs.map(tab => (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', tab.iconGradient)}>
                    <Icon name={tab.icon} className="w-3 h-3 text-white" />
                  </div>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="ml-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Tabs Content */}
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="p-4 sm:p-6 m-0">
              {/* Actions Bar */}
              {tab.actions && tab.actions.length > 0 && (
                <div className="flex gap-2 mb-4">
                  {tab.actions.map((action, idx) => (
                    <Button
                      key={idx}
                      onClick={action.onClick}
                      className={cn(
                        'text-white font-medium px-4 py-2 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
                        action.gradient
                      )}
                    >
                      <Icon name={action.icon} className="w-4 h-4 mr-2" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              )}

              {/* Content */}
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default DashboardTabs
