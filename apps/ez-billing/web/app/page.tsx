'use client';

import { LoginSection } from '@/components/login-section';
import { useUserStore } from '@/stores/useUserStore';
import { H1, Section } from '@ezstart/ui/components';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user } = useUserStore();

  useEffect(() => {
    if (user) {
      redirect('/dashboard');
    }
  }, [user]);

  if (user) {
    return null; // Redirect in progress
  }

  return (
    <Section className="flex flex-col gap-6 max-w-md mx-auto mt-20">
      <H1 className="text-center">EZ-Billing</H1>
      <LoginSection />
    </Section>
  );
}