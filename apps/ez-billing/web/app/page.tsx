'use client'

import { EZAuthLoginSection } from '@/components/ezauth-login-section'
import { useAuth } from '@ezstart/auth-sdk'
import { H1, H3, Icon, P } from '@ezstart/ui/components'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { cleanupOldAuth } from '@/utils/cleanup-old-auth'

export default function HomePage() {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    cleanupOldAuth()
    if (isAuthenticated && user) {
      redirect('/dashboard')
    }
  }, [isAuthenticated, user])

  if (isAuthenticated && user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="mt-8 mb-4 md:mb-8">
            <div className="flex items-center justify-center gap-2">
              <div className="p-2 md:p-3 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <Icon name="lucide:Receipt" className="text-white" />
              </div>
              <H1 className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent w-fit">
                EZ-Billing
              </H1>
            </div>
            <P className="max-w-2xl mx-auto">
              Professional invoicing and billing made simple. Create beautiful invoices, manage
              clients, and track payments with ease.
            </P>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8  max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:FileText" className="w-6 h-6 text-white" />
              </div>
              <H3 size={'h4'} className="md:text-center">
                Smart Invoicing
              </H3>
              <P>Create professional invoices and quotes in seconds with our intuitive interface</P>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:Users" className="w-6 h-6 text-white" />
              </div>
              <H3 size={'h4'} className="md:text-center">
                Client Management
              </H3>
              <P>Organize your clients and companies with detailed contact information</P>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:TrendingUp" className="w-6 h-6 text-white" />
              </div>
              <H3 size={'h4'} className="md:text-center">
                Payment Tracking
              </H3>
              <P>Track payments and manage receipts to stay on top of your finances</P>
            </div>
          </div>
        </div>

        {/* Login Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
            <p className="text-gray-600">Enter your username to begin</p>
          </div>
          <EZAuthLoginSection />
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p className="text-sm">Simple • Professional • Efficient</p>
        </div>
      </div>
    </div>
  )
}
