import { notFound } from 'next/navigation';
<<<<<<< HEAD
import { AuthPage } from './(auth)/page-auth';
=======
>>>>>>> master
import { BillingPage } from './(billing)/page-billing';

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
<<<<<<< HEAD

  switch (feature) {
    case 'billing':
      return <BillingPage />;
    case 'auth':
      return <AuthPage />;
=======
  console.log('feature page', feature);

  switch (feature) {
    case 'ez-billing':
      return <BillingPage />;
>>>>>>> master
    default:
      notFound();
  }
}
