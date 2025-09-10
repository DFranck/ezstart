import { notFound } from 'next/navigation';
import EzIconPage from './page/page-icon';
import EzTagPage from './page/page-tag';

export default async function LibPage({
  params,
}: {
  params: Promise<{ lib: string }>;
}) {
  const { lib } = await params;

  switch (lib) {
    case 'tag':
      return <EzTagPage />;
    case 'icon':
      return <EzIconPage />;
    default:
      notFound();
  }
}
