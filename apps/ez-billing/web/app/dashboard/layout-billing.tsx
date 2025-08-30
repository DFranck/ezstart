'use client';

import { useBillingContext } from '@/contexts/billing-context';
import { BillingProvider } from '@/providers/billing-provider';
import { ClientModal } from '@/components/client-modal';
import { Button, H1, Header, Icon, Main } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import Link from 'next/link';
import { useState } from 'react';

const LayoutDashboard = ({ children }: { children: React.ReactNode }) => {
  return (
    <BillingProvider>
      <DashboardLayoutWithData>{children}</DashboardLayoutWithData>
    </BillingProvider>
  );
};

const DashboardLayoutWithData = ({ children }: { children: React.ReactNode }) => {
  const { refetchAll } = useBillingContext();
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  return (
    <>
      <Header
        className={cn('h-16 bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm')}
        leftContent={
          <div className="flex items-center space-x-4">
            <H1 size={'h5'} asChild className='text-start w-fit font-bold text-gray-900'>
              <Link href='/dashboard' className="hover:text-blue-600 transition-colors">
                EzBilling
              </Link>
            </H1>
          </div>
        }
        rightContent={
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => setIsClientModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              <Icon name='fa:FaPlus' className="mr-2" /> 
              New Client
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                localStorage.clear();
                window.location.href = '/';
              }}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Icon name='fa:FaSignOutAlt' className="mr-2" />
              Logout
            </Button>
          </div>
        }
      />
      <Main className="bg-gray-50 min-h-screen">{children}</Main>
      
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onSave={refetchAll}
      />
    </>
  );
};

export default LayoutDashboard;
