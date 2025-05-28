import { notFound } from 'next/navigation';
import { LayoutBilling } from './(billing)/layout-billing';
import { FeatureId } from './types';

export default async function FeatureLayout({
  params,
}: {
  params: Promise<{ feature: FeatureId }>;
}) {
  const { feature } = await params;

  switch (feature) {
    case 'billing':
      return <LayoutBilling />;
    default:
      notFound();
  }
}
