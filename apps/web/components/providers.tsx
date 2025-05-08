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
}: {
  children: React.ReactNode;
  messages: AbstractIntlMessages;
  locale: Locale;
}) {
  return (
    <NextThemesProvider
      attribute='class'
      defaultTheme='system'
      enableSystem
      disableTransitionOnChange
      enableColorScheme
    >
      <NextIntlClientProvider messages={messages} locale={locale}>
        {children}
      </NextIntlClientProvider>
    </NextThemesProvider>
  );
}
