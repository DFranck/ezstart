export default function HomePage() {
  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-4">EZPay</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Universal Payment System for the EZStart ecosystem
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">💝 Donations</h3>
            <p className="text-sm text-muted-foreground">
              Accept donations with testimonials and public walls
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">🛒 Purchases</h3>
            <p className="text-sm text-muted-foreground">
              Sell products and in-app items with Stripe
            </p>
          </div>

          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">📅 Subscriptions</h3>
            <p className="text-sm text-muted-foreground">
              Manage recurring payments and premium plans
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-muted rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
          <div className="text-left space-y-4">
            <div>
              <h3 className="font-semibold">1. Install SDK</h3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                pnpm add @ezstart/pay-sdk
              </code>
            </div>

            <div>
              <h3 className="font-semibold">2. Setup Client</h3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                {`import { createPayClient } from '@ezstart/pay-sdk'`}
                <br />
                {`const client = createPayClient({ appName: 'my-app' })`}
              </code>
            </div>

            <div>
              <h3 className="font-semibold">3. Use Components</h3>
              <code className="text-sm bg-background p-2 block rounded mt-2">
                {`import { DonateModal, DonationWall } from '@ezstart/pay-sdk'`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
