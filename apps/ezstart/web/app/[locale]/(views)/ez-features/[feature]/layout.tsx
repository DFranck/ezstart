import { notFound } from 'next/navigation';
<<<<<<< HEAD
import { LayoutAuth } from './(auth)/layout-auth';
=======
>>>>>>> master
import { LayoutBilling } from './(billing)/layout-billing';

export default async function FeatureLayout({
  params,
  children,
}: {
  params: Promise<{ feature: string }>;
  children: React.ReactNode;
}) {
  const { feature } = await params;
<<<<<<< HEAD
  switch (feature) {
    case 'billing':
      return <LayoutBilling children={children} />;
    case 'auth':
      return <LayoutAuth children={children} />;
=======
  console.log('feature layout', feature);
  switch (feature) {
    case 'ez-billing':
      return <LayoutBilling children={children} />;
>>>>>>> master
    default:
      notFound();
  }
}
