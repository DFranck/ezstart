import { notFound } from 'next/navigation';
import { LayoutAuth } from './(auth)/layout-auth';
import { LayoutBilling } from './(billing)/layout-billing';

export default async function FeatureLayout({
  params,
  children,
}: {
  params: Promise<{ feature: string }>;
  children: React.ReactNode;
}) {
  const { feature } = await params;
  switch (feature) {
    case 'billing':
      return <LayoutBilling children={children} />;
    case 'auth':
      return <LayoutAuth children={children} />;
    default:
      notFound();
  }
}
