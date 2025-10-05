'use client'

import { DonateModal, DonationWall } from '@ezstart/pay-sdk'
import { useAuth } from '@ezstart/auth-sdk'

export default function DonatePage() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Support Feng Shui</h1>
          <p className="text-xl text-muted-foreground">
            Help us keep this app free and improve it with new features
          </p>
        </div>

        {/* Donate Button */}
        <div className="flex justify-center mb-16">
          <DonateModal
            projectId="fengshui"
            projectName="Feng Shui Bagua"
            amounts={[5, 10, 25, 50, 100]}
            userId={user?._id}
            userEmail={user?.email}
            userName={user?.username}
          />
        </div>

        {/* Donation Wall */}
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-center">Recent Supporters</h2>
          <DonationWall projectId="fengshui" limit={12} />
        </div>

        {/* Thank You Message */}
        <div className="mt-16 p-6 bg-muted rounded-lg text-center">
          <p className="text-muted-foreground">
            ❤️ Thank you to all our supporters! Your contributions help us maintain and improve
            Feng Shui Bagua for everyone.
          </p>
        </div>
      </div>
    </div>
  )
}
