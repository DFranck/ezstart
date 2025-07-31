'use client';

import { routing } from '@/i18n/routing';
import { Dropdown, DropdownItem, Icon } from '@ezstart/ui/components';
import { capitalize } from '@ezstart/ui/utils';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  const items: DropdownItem[] = routing.locales.map((code) => {
    const nativeName = new Intl.DisplayNames([code], { type: 'language' }).of(
      code
    );
    return {
      label: capitalize(nativeName ?? code),
      value: code,
      onSelect: () => {
        if (!pathname) return;
        const segments = pathname.split('/');
        segments[1] = code;
        router.push(segments.join('/'));
      },
    };
  });

  const activeLabel =
    items.find((i) => i.value === currentLocale)?.label ?? currentLocale;
  const triggerLabel = (
    <>
      <Icon name='lucide:Globe' />
      <span className='align-middle'>{activeLabel}</span>
    </>
  );

  return <Dropdown label={triggerLabel} items={items} />;
}
