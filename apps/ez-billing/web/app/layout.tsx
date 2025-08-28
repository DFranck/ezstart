import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import '@ezstart/ui/globals.css';

const fontSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'EZ Billing',
  description: 'Simple billing management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={`${fontSans.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}