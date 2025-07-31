import { useNavLinks } from '@/hooks/useNavLinks';
import { Button, Dropdown } from '@ezstart/ui/components';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  setIsOpen?: (isOpen: boolean) => void;
}

export function NavMenu({
  variant = 'link',
  className,
  setIsOpen,
}: NavMenuProps) {
  const router = useRouter();
  const links = useNavLinks();
  const currentLocale = useLocale();
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
              onSelect: () => {
                const targetHref =
                  sub.href === '/'
                    ? `/${currentLocale}`
                    : `/${currentLocale}${sub.href}`;
                router.push(targetHref);
                setIsOpen?.(false);
              },
            }))}
          />
        ) : (
          <Button
            variant={variant}
            key={item.href}
            asChild
            onClick={() => setIsOpen?.(false)}
          >
            <Link
              href={`/${currentLocale}${item.href === '/' ? '' : item.href}`}
            >
              {item.label}
            </Link>
          </Button>
        )
      )}
    </nav>
  );
}
