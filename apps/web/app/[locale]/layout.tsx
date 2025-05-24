import { Footer } from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import MobileNavbar from '@/components/layout/MobileNavbar';
import { Providers } from '@/components/providers';
import { routing } from '@/i18n/routing';
import { Toaster } from '@ezstart/ui/src/components/sonner';
import '@ezstart/ui/globals.css';
import { hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';

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

  return (
    <html lang={locale} suppressHydrationWarning className='h-full'>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased flex flex-col h-full`}
      >
        <Providers messages={messages} locale={locale}>
          <Header />
          {children}
          <MobileNavbar />
          <Footer />
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
