'use client'

import ClientLayout from '@/components/ClientLayout'
import { EZAuthLoginSection } from '@/components/ezauth-login-section'
import { cleanupOldAuth } from '@/utils/cleanup-old-auth'
import { useAuth } from '@ezstart/auth-sdk'
import { Card, CardContent, CardHeader, H1, H2, H3, Icon, Main, P } from '@ezstart/ui/components'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

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
    <ClientLayout>
      <Main>
        {/* Hero Section */}
        <div className="text-center mb-8">
          {/* Logo */}
          <Card className="mt-8 mb-4 md:mb-8" variant="ghost">
            <CardHeader className="flex items-center justify-center gap-2">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center mb-2">
                <Icon name="lucide:Receipt" className="w-6 h-6 text-white" />
              </div>
              <H1 className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent w-fit">
                EZBill
              </H1>
            </CardHeader>
            <CardContent>
              <P className="max-w-2xl mx-auto">
                Professional invoicing and billing made simple. Create beautiful invoices, manage
                clients, and track payments with ease.
              </P>
            </CardContent>
          </Card>

          {/* Features */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8  max-w-4xl mx-auto">
            <Card variant={'floating'}>
              <CardContent>
                <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon name="lucide:FileText" className="w-6 h-6 text-white" />
                </div>
                <H3 size={'h4'}>Smart Invoicing</H3>
                <P>
                  Create professional invoices and quotes in seconds with our intuitive interface
                </P>
              </CardContent>
            </Card>

            <Card variant="floating">
              <CardContent>
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon name="lucide:Users" className="w-6 h-6 text-white" />
                </div>
                <H3 size={'h4'}>Client Management</H3>
                <P>Organize your clients and companies with detailed contact information</P>
              </CardContent>
            </Card>

            <Card variant="floating">
              <CardContent>
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon name="lucide:TrendingUp" className="w-6 h-6 text-white" />
                </div>
                <H3 size={'h4'}>Payment Tracking</H3>
                <P>Track payments and manage receipts to stay on top of your finances</P>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Login Section */}
        <Card id="login" variant="floating" className="w-full max-w-md">
          <CardHeader>
            <H2>Get Started</H2>
          </CardHeader>
          <CardContent>
            <EZAuthLoginSection />
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-12 text-center">
          <P className="text-muted-foreground text-sm">Simple • Professional • Efficient</P>
        </div>
      </Main>
    </ClientLayout>
  )
}
