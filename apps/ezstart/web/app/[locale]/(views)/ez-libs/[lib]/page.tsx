import { notFound } from 'next/navigation';
import EzIconPage from './page/page-icon';
import EzTagPage from './page/page-tag';
import { LibId } from './types';

export default async function LibPage({
  params,
}: {
  params: Promise<{ lib: LibId }>;
}) {
  const { lib } = await params;

  switch (lib) {
    case 'eztag':
      return <EzTagPage />;
    case 'ezicon':
      return <EzIconPage />;
    default:
      notFound();
  }
}
