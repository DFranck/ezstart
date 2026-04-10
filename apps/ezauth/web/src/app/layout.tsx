import '@ezstart/ui/globals.css'
import { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

export default function RootLayout({ children }: Props) {
  return (
    <html suppressHydrationWarning data-app="ezauth">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
