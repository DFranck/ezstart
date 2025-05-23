import { Dropdown } from '@/components/ui/dropdown';
import { useNavLinks } from '@/hooks/useNavLinks';
import { Button } from '@ezstart/ez-tag';
import Link from 'next/link';

export function NavMenu() {
  const links = useNavLinks();

  return (
    <nav>
      {links.map((item, i) =>
        'menu' in item ? (
          <Dropdown
            variant={'link'}
            key={i}
            label={item.menuLabel}
            items={item.menu.map((sub) => ({
              label: sub.label,
              value: sub.href,
              onSelect: () => (window.location.href = sub.href),
            }))}
          />
        ) : (
          <Button variant={'link'} key={item.href} asChild>
            <Link href={item.href}>{item.label}</Link>
          </Button>
        )
      )}
    </nav>
  );
}
