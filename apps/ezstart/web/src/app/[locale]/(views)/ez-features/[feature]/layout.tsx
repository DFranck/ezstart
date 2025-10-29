export default async function FeatureLayout({
  params,
  children,
}: {
  params: Promise<{ feature: string }>;
  children: React.ReactNode;
}) {
  const { feature } = await params;
  console.log('feature layout', feature);

  // All features use default layout
  return <>{children}</>;
}
