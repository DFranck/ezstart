import { notFound } from 'next/navigation';
import { BillingPage } from './(billing)/page-billing';

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  console.log('feature page', feature);

  switch (feature) {
    case 'ezbill':
      return <BillingPage />;
    default:
      notFound();
  }
}
