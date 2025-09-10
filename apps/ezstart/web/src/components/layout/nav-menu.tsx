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
  
  // SSR-safe locale handling
  let currentLocale = 'en'
  try {
    currentLocale = useLocale()
  } catch (error) {
    console.warn('useLocale failed in NavMenu, using fallback:', error)
    currentLocale = 'en'
  }

  const isExternalLink = (href: string) => {
    return href.startsWith('http://') || href.startsWith('https://');
  };

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
                if (isExternalLink(sub.href)) {
                  window.open(sub.href, '_blank', 'noopener,noreferrer');
                } else {
                  const targetHref =
                    sub.href === '/'
                      ? `/${currentLocale}`
                      : `/${currentLocale}${sub.href}`;
                  router.push(targetHref);
                }
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
            {isExternalLink(item.href) ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {item.label}
              </a>
            ) : (
              <Link
                href={`/${currentLocale}${item.href === '/' ? '' : item.href}`}
              >
                {item.label}
              </Link>
            )}
          </Button>
        )
      )}
    </nav>
  );
}
