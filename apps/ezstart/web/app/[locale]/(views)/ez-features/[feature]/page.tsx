import { notFound } from 'next/navigation';
import { AuthPage } from './(auth)/page-auth';
import { BillingPage } from './(billing)/page-billing';

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;

  switch (feature) {
    case 'billing':
      return <BillingPage />;
    case 'auth':
      return <AuthPage />;
    default:
      notFound();
  }
}
