'use client'

import { useBillingContext } from '@/contexts/billing-context'
import { BillingProvider } from '@/providers/billing-provider'
import { useAuth } from '@ezstart/auth-sdk'
import { Button, H1, Header, Icon } from '@ezstart/ui/components'
import { cn } from '@ezstart/ui/lib'
import Link from 'next/link'

const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <DashboardLayoutWithData>{children}</DashboardLayoutWithData>
    </BillingProvider>
  )
}

const DashboardLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  const { refetchAll } = useBillingContext()
  const { user } = useAuth()
  return (
    <>
      <Header
        className={cn(
          'h-20 backdrop-blur-sm bg-white/70 border-b border-white/20 sticky top-0 z-50 shadow-lg'
        )}
        leftContent={
          <div className="flex items-center space-x-4">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Icon name="lucide:Receipt" className="w-5 h-5 text-white" />
              </div>
              <div>
                <H1
                  size={'h5'}
                  className="text-start w-fit font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent"
                >
                  EZ-Billing
                </H1>
                <p className="text-xs text-gray-500 -mt-1">Professional Billing</p>
              </div>
            </Link>
          </div>
        }
        rightContent={
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Button
              variant="outline"
              asChild
              className="bg-white/60 backdrop-blur-sm border-white/30 text-gray-700 hover:bg-white/80 font-medium px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <Link href="/dashboard/settings">
                <Icon name="lucide:Settings" className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </Button>
            <Button
              onClick={() => {
                localStorage.clear()
                window.location.href = '/'
              }}
              className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-medium px-2 py-2 sm:px-4 sm:py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <Icon name="lucide:LogOut" className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        }
      />
      {children}
    </>
  )
}

export default LayoutDashboard
