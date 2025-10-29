import { notFound } from 'next/navigation';

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;
  console.log('feature page', feature);

  // Features are handled by their respective (feature-name)/page.tsx files
  // This file should not be reached
  notFound();
}
