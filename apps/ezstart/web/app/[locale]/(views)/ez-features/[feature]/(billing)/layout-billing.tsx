import { BillingProvider } from '@/providers/billing-provider';

export const LayoutBilling = ({ children }: { children: React.ReactNode }) => {
  return <BillingProvider>{children}</BillingProvider>;
};
