import { Button, Card, CardContent, Icon, KnownIconName, P } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import { ReactNode } from 'react'

type Props = {
  title: string
  description: string
  icon: KnownIconName
  iconGradient: string
  onAdd: () => void
  addButtonText: string
  addButtonIcon: KnownIconName
  addButtonGradient: string
  children: ReactNode
  emptyState?: {
    icon: KnownIconName
    iconBg: string
    title: string
    description: string
    buttonText: string
  }
  isEmpty?: boolean
  className?: string
}

const DashboardSection = ({
  title,
  description,
  icon,
  iconGradient,
  onAdd,
  addButtonText,
  addButtonIcon,
  addButtonGradient,
  children,
  emptyState,
  isEmpty = false,
  className,
}: Props) => {
  return (
    <Card variant="floating" className={cn('', className)}>
      <CardContent className="p-0">
        <div className="p-4 sm:p-6 border-b border-foreground/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div
                className={cn(
                  'w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center',
                  'hidden sm:flex',
                  iconGradient
                )}
              >
                <Icon name={icon} className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold ">{title}</h2>
                <P size="xs" variant={'description'}>
                  {description}
                </P>
              </div>
            </div>
            <Button
              onClick={onAdd}
              className={cn(
                'text-white font-medium px-3 py-2 sm:px-6 sm:py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
                addButtonGradient
              )}
            >
              <Icon name={addButtonIcon} className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">{addButtonText}</span>
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {isEmpty && emptyState ? (
            <div className="text-center py-12">
              <div
                className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6',
                  emptyState.iconBg
                )}
              >
                <Icon name={emptyState.icon} className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
              <p className="text-foreground/60 mb-6">{emptyState.description}</p>
              <Button
                onClick={onAdd}
                className={cn('text-white font-medium px-6 py-3 rounded-xl', addButtonGradient)}
              >
                <Icon name={addButtonIcon} className="w-4 h-4 mr-2" />
                {emptyState.buttonText}
              </Button>
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default DashboardSection
