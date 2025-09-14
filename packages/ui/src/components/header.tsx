import { useOnScroll } from '../hooks'
import { cn } from '../lib/utils'
import { Div, Tag } from './tag'
import { headerVariantConfig } from './tag/src/variants/tags/header'

type Props = {
  leftContent?: React.ReactNode
  centerContent?: React.ReactNode
  rightContent?: React.ReactNode
  children?: React.ReactNode
  position?: keyof typeof headerVariantConfig.position
  layout?: keyof typeof headerVariantConfig.layout
  className?: string
}

export const Header = ({
  leftContent,
  centerContent,
  rightContent,
  children,
  layout = 'default',
  position = 'static',
  className,
}: Props) => {
  const scrollY = useOnScroll()
  const isTop = scrollY === 0
  return (
    <Tag
      as="header"
      layout={layout}
      position={position}
      className={cn(
        'px-2 md:px-6',
        (position === 'sticky' || position === 'fixed') && [
          'transition-all duration-200 ease-out backdrop-blur-sm border-b',
          isTop
            ? 'bg-background/0 border-border/0 py-4'
            : 'bg-background/95 border-border/20 py-2 shadow-sm',
        ],
        className
      )}
    >
      <Div layout={'row'} size={'default'} className="w-full">
        {leftContent && leftContent}
        {centerContent && centerContent}
        {rightContent && rightContent}
      </Div>

      {children && (
        <Div size={'default'} layout={'row'}>
          {children}
        </Div>
      )}
    </Tag>
  )
}
