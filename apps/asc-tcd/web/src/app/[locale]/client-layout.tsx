'use client';
import { Footer } from '@/components/layout/footer';
import Header from '@/components/layout/header/header';
import MobileNavbar from '@/components/layout/mobile-nav-bar';
import { usePathname } from 'next/navigation';
import React from 'react';

const ClientLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const isFeatureScoped = segments[1] === 'ez-features' && !!segments[2];

  return (
    <>
      {!isFeatureScoped && <Header />}
      {children}
      {!isFeatureScoped && <MobileNavbar />}
      <Footer />
    </>
  );
};

export default ClientLayout;
