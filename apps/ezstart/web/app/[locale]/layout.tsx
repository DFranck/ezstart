import { Providers } from '@/components/providers';
import { getTimeZoneFromLocale, routing } from '@/i18n/routing';
import { Toaster } from '@ezstart/ui/components';
import '@ezstart/ui/globals.css';
import { hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import ClientLayout from './client-layout';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default async function LocaleLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { children, params } = props;
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const timeZone = getTimeZoneFromLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning className=''>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased flex flex-col h-full`}
      >
        <Providers messages={messages} locale={locale} timeZone={timeZone}>
          <ClientLayout>{children}</ClientLayout>
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
