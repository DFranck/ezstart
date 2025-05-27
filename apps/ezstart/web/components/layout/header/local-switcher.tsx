'use client';

import { routing } from '@/i18n/routing';
import { capitalize } from '@/utils/capitalize';
import { Dropdown, DropdownItem, Icon } from '@ezstart/ui/components';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale(); // ex: 'en' ou 'fr'
  const t = useTranslations();

  // Formatter le nom de la langue
  const langNames = new Intl.DisplayNames([currentLocale], {
    type: 'language',
  });

  // Construire les items pour le Dropdown
  const items: DropdownItem[] = routing.locales.map((code) => ({
    label: capitalize(langNames.of(code) ?? code),
    value: code,
    onSelect: () => {
      if (!pathname) return;
      const segments = pathname.split('/');
      segments[1] = code;
      router.push(segments.join('/'));
    },
  }));

  // Label affiché sur le bouton (avec icône)
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
