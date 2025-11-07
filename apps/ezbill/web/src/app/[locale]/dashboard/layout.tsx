'use client'

import ClientLayout from '@/components/ClientLayout'
import { BillingProvider } from '@/providers/billing-provider'

const LayoutDashboard = ({ children }: { children: React.ReactNode }): any => {
  return (
    <BillingProvider>
      <DashboardLayoutWithData>{children}</DashboardLayoutWithData>
    </BillingProvider>
  )
}

const DashboardLayoutWithData = ({ children }: { children: React.ReactNode }): any => {
  return (
    <ClientLayout showSettingsButton showLogoutButton>
      {children}
    </ClientLayout>
  )
}

export default LayoutDashboard
