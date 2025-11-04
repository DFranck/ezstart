import { useOnScroll } from '../../hooks'
import { cn } from '../../lib/utils'
import { Div, Tag } from '../tag'
import { headerVariantConfig } from '../tag/src/variants/tags/header'

/**
 * Header Component - Responsive Site Header
 *
 * Flexible header with position variants, scroll effects, and content slots.
 * Built on Tag component with semantic HTML and accessibility.
 *
 * @example
 * // Basic header
 * <Header
 *   leftContent={<Logo />}
 *   rightContent={<UserMenu />}
 * />
 *
 * @example
 * // Sticky header with scroll effects
 * <Header
 *   position="sticky"
 *   layout="between"
 *   leftContent={<Logo />}
 *   centerContent={<Nav />}
 *   rightContent={<Actions />}
 * />
 *
 * @example
 * // Fixed header with custom content
 * <Header position="fixed">
 *   <CustomHeaderContent />
 * </Header>
 */

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
          'transition-all duration-200 ease-out backdrop-blur-sm',
          isTop ? 'bg-background/0  py-4' : 'bg-background/80  py-2',
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
