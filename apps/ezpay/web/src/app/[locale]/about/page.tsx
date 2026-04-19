import { Card, CardContent, CardHeader, H1, P, Main } from '@ezstart/ui/components'

export default function AboutPage() {
  return (
    <Main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <H1 size="h2">About EZPay</H1>
        </CardHeader>
        <CardContent>
          <P className="text-muted-foreground">
            EZPay is a universal payment system built by EZStart. It provides donations,
            one-time purchases, and subscription management for all your applications,
            powered by Stripe.
          </P>
        </CardContent>
      </Card>
    </Main>
  )
}
