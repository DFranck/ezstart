import { notFound } from 'next/navigation';
import { BillingPage } from './(billing)/page-billing';
import { FeatureId } from './types';

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ feature: FeatureId }>;
}) {
  const { feature } = await params;

  switch (feature) {
    case 'ezbilling':
      return <BillingPage />;
    default:
      notFound();
  }
}
