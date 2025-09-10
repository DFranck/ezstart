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
        position === 'sticky' &&
          `px-2 py-4 ${isTop ? 'bg-transparent' : 'bg-background border-b-2'}`,
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
