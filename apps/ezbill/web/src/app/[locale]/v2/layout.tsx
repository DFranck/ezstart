import { createMetadata } from '@ezstart/seo-config/metadata'
import { ReactNode } from 'react'

export const metadata = createMetadata({
  appName: 'EZBill',
  description: 'Professional invoicing without subscription fees. Own your invoicing system forever.',
  domain: 'https://ezbill-web.vercel.app',
  keywords: ['billing', 'invoicing', 'freelance', 'no subscription', 'one-time payment'],
})

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

export default async function V2Layout({ children }: Props) {
  return children
}