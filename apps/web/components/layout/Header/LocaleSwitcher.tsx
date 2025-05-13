'use client';

import { EzTag } from '@ezstart/ez-tag';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu';
import { GlobeIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();
  const t = useTranslations();

  const onSelectLocale = (locale: string) => {
    if (!pathname) return;
    const segments = pathname.split('/');
    segments[1] = locale;
    router.push(segments.join('/'));
  };

  const activeLabel =
    LOCALES.find((l) => l.code === currentLocale)?.label ?? currentLocale;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <EzTag
          as={'button'}
          variant={'button.primary.small'}
          className='cursor-pointer'
          aria-label={t('LocaleSwitcher.label')}
        >
          <GlobeIcon className='w-4 h-4 mr-2' />
          {activeLabel}
        </EzTag>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {LOCALES.map((locale) => (
          <DropdownMenuItem
            key={locale.code}
            onClick={() => onSelectLocale(locale.code)}
            className={locale.code === currentLocale ? 'font-semibold' : ''}
          >
            {locale.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
