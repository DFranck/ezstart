import { headers } from 'next/headers'
import { getServerAuth } from '@ezstart/auth-sdk/server'
import { Providers } from '@/components/providers'
import '@ezstart/ui/globals.css'

export const metadata = {
  title: 'auth-sdk Next.js minimal example',
  description: 'Drop-in auth with SSR bootstrap — no login flash on first paint.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieHeader = (await headers()).get('cookie') ?? undefined
  const initialUser = await getServerAuth({
    apiUrl: process.env.NEXT_PUBLIC_AUTH_API_URL!,
    cookieHeader,
  })

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers initialUser={initialUser}>{children}</Providers>
      </body>
    </html>
  )
}
