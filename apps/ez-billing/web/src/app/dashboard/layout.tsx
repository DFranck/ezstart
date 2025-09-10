'use client'

import ClientLayout from '@/components/ClientLayout'
import { useBillingContext } from '@/contexts/billing-context'
import { BillingProvider } from '@/providers/billing-provider'

const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <DashboardLayoutWithData>{children}</DashboardLayoutWithData>
    </BillingProvider>
  )
}

const DashboardLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  return (
    <ClientLayout showSettingsButton showLogoutButton>
      {children}
    </ClientLayout>
  )
}

export default LayoutDashboard
