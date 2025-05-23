import { Dropdown } from '@/components/ui/dropdown';
import { useNavLinks } from '@/hooks/useNavLinks';
import { Button } from '@ezstart/ez-tag';
import Link from 'next/link';

interface NavMenuProps {
  variant?:
    | 'default'
    | 'ghost'
    | 'secondary'
    | 'outline'
    | 'destructive'
    | 'link'
    | null;
  className?: string;
}

export function NavMenu({ variant = 'link', className }: NavMenuProps) {
  const links = useNavLinks();

  return (
    <nav className={className}>
      {links.map((item, i) =>
        'menu' in item ? (
          <Dropdown
            variant={variant}
            key={i}
            label={item.menuLabel}
            items={item.menu.map((sub) => ({
              label: sub.label,
              value: sub.href,
              onSelect: () => (window.location.href = sub.href),
            }))}
          />
        ) : (
          <Button variant={variant} key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        )
      )}
    </nav>
  );
}
