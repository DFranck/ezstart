export default async function FeatureLayout({
  params,
  children,
}: {
  params: Promise<{ feature: string }>
  children: React.ReactNode
}) {
  const { feature } = await params
  // Layout params available for feature-specific logic

  // All features use default layout
  return <>{children}</>
}
