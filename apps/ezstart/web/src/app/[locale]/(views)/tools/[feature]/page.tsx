import { notFound } from 'next/navigation';
import QRCodePage from './(qr-code)/qr-code-page';
import BusinessCardPage from './(business-card)/business-card-page';
import CVGeneratorPage from './(cv-generator)/cv-generator-page';

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ feature: string }>;
}) {
  const { feature } = await params;

  switch (feature) {
    case 'qr-code':
      return <QRCodePage />;
    case 'business-card':
      return <BusinessCardPage />;
    case 'cv-generator':
      return <CVGeneratorPage />;
    default:
      notFound();
  }
}
