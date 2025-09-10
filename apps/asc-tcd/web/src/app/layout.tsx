import { SimpleWebProviders } from '@ezstart/web-core/providers';
import { Toaster } from '@ezstart/ui/components';
import '@ezstart/ui/globals.css';
import { Geist, Geist_Mono } from 'next/font/google';

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body 
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased flex flex-col min-h-screen`}
      >
        <SimpleWebProviders appName="asc-tcd">
          {children}
        </SimpleWebProviders>
        <Toaster />
      </body>
    </html>
  );
}
