import { notFound } from 'next/navigation';
import { LayoutBilling } from './(billing)/layout-billing';
import { FeatureId } from './types';

export default async function FeatureLayout({
  params,
  children,
}: {
  params: Promise<{ feature: FeatureId }>;
  children: React.ReactNode;
}) {
  const { feature } = await params;

  switch (feature) {
    case 'billing':
      return <LayoutBilling children={children} />;
    default:
      notFound();
  }
}
