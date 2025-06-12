import { notFound } from 'next/navigation';
import EzIconPage from './(icon)/page-icon';
import EzTagPage from './(tag)/page-tag';
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
