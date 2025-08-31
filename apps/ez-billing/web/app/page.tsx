'use client'

import { LoginSection } from '@/components/login-section'
import { useUserStore } from '@/stores/useUserStore'
import { Icon } from '@ezstart/ui/components'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function HomePage() {
  const { user } = useUserStore()

  useEffect(() => {
    if (user) {
      redirect('/dashboard')
    }
  }, [user])

  if (user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Hero Section */}
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center mb-12">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <Icon name="lucide:Receipt" className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent mb-4">
              EZ-Billing
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Professional invoicing and billing made simple. Create beautiful invoices, manage clients, and track payments with ease.
            </p>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12 max-w-4xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:FileText" className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Smart Invoicing</h3>
              <p className="text-gray-600 text-sm">Create professional invoices and quotes in seconds with our intuitive interface</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:Users" className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Client Management</h3>
              <p className="text-gray-600 text-sm">Organize your clients and companies with detailed contact information</p>
            </div>
            
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icon name="lucide:TrendingUp" className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Payment Tracking</h3>
              <p className="text-gray-600 text-sm">Track payments and manage receipts to stay on top of your finances</p>
            </div>
          </div>
        </div>
        
        {/* Login Section */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h2>
            <p className="text-gray-600">Enter your username to begin</p>
          </div>
          <LoginSection />
        </div>
        
        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p className="text-sm">Simple • Professional • Efficient</p>
        </div>
      </div>
    </div>
  )
}
