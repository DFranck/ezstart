import { Card, CardContent, Icon, KnownIconName, P, Div } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'

type Props = {
  title: string
  value: string
  icon: KnownIconName
  iconGradient: string
  className?: string
}

const StatsCard = ({ title, value, icon, iconGradient, className }: Props): React.JSX.Element => {
  return (
    <Card variant="floating" className={cn('', className)}>
      <CardContent className="flex items-center">
        <Div
          className={cn(
            'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center',
            iconGradient
          )}
        >
          <Icon name={icon} className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </Div>
        <Div className="ml-3 sm:ml-4">
          <P className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{value}</P>
          <P size="xs" className="text-muted-foreground">
            {title}
          </P>
        </Div>
      </CardContent>
    </Card>
  )
}

export default StatsCard
