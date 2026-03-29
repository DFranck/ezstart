import { useNavLinks } from '@/hooks/useNavLinks'
import { Button, Dropdown, Icon, Nav } from '@ezstart/ui/components'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface NavMenuProps {
  variant?: 'default' | 'ghost' | 'secondary' | 'outline' | 'destructive' | 'link' | null
  className?: string
  setIsOpen?: (isOpen: boolean) => void
}

export function NavMenu({ variant = 'link', className, setIsOpen }: NavMenuProps) {
  const router = useRouter()
  const links = useNavLinks()

  return (
    <Nav className={className}>
      {links.map((item, i) =>
        'menu' in item ? (
          <Dropdown
            variant={variant}
            key={i}
            label={item.menuLabel}
            items={item.menu.map(sub => ({
              label: sub.label,
              value: sub.href,
              onSelect: () => {
                router.push(sub.href)
                setIsOpen?.(false)
              },
            }))}
          />
        ) : (
          <Button
            variant={'href' in item && item.href.startsWith('http') ? 'default' : variant}
            key={item.href}
            asChild
            onClick={() => setIsOpen?.(false)}
          >
            {'href' in item && item.href.startsWith('http') ? (
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                {item.label}
                <Icon name="lucide:ExternalLink" />
              </a>
            ) : (
              <Link href={item.href}>{item.label}</Link>
            )}
          </Button>
        )
      )}
    </Nav>
  )
}
