'use client'
import { Footer } from '@/components/layout/footer'
import Header from '@/components/layout/header/header'
import MobileNavbar from '@/components/layout/mobile-nav-bar'
import React from 'react'

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <Header />
      {children}
      <MobileNavbar />
      <Footer />
    </>
  )
}

export default ClientLayout
