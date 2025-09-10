import { notFound } from 'next/navigation';
import { LayoutBilling } from './(billing)/layout-billing';

export default async function FeatureLayout({
  params,
  children,
}: {
  params: Promise<{ feature: string }>;
  children: React.ReactNode;
}) {
  const { feature } = await params;
  console.log('feature layout', feature);
  switch (feature) {
    case 'ez-billing':
      return <LayoutBilling children={children} />;
    default:
      notFound();
  }
}
