import { Card, CardContent, H3, Icon, P } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import React from 'react'

type Props = {
  setter: React.Dispatch<React.SetStateAction<boolean>>
  className?: string
  title: string
  description?: string
  descriptionClassName?: string
}

const FirstActionCard = ({
  setter,
  className,
  descriptionClassName,
  title,
  description,
}: Props) => {
  return (
    <Card
      className={cn(
        'relative overflow-hidden group cursor-pointer transform hover:scale-105 transition-all duration-300 w-full',
        className
      )}
      onClick={() => setter(true)}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-500"></div>
      <CardContent className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Icon name="lucide:UserPlus" className="w-8 h-8" />
          <Icon
            name="lucide:ArrowRight"
            className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform"
          />
        </div>
        <H3 className="text-left" size={'h5'}>
          {title}
        </H3>
        {description && (
          <P size={'xs'} className={cn('', descriptionClassName)}>
            {description}
          </P>
        )}
      </CardContent>
    </Card>
  )
}

export default FirstActionCard
