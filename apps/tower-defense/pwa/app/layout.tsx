import { routing } from '@/i18n/routing'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Tower Defense',
  description: 'Competitive multiplayer Tower Defense game',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Redirect to default locale
  redirect(`/${routing.defaultLocale}`)
}