'use client';

import {
  AbstractIntlMessages,
  Locale,
  NextIntlClientProvider,
} from 'next-intl';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import * as React from 'react';

export function Providers({
  children,
  messages,
  locale,
  timeZone,
}: {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale: Locale;
  timeZone: string;
}) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <NextIntlClientProvider
        messages={messages}
        locale={locale}
        timeZone={timeZone}
      >
        {children}
      </NextIntlClientProvider>
    </NextThemesProvider>
  );
}
