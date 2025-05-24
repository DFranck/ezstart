import { notFound } from 'next/navigation';
import { LibId } from '../libData';
import EzTagPage from './(eztag)/EzTagPage';
import EzIconPage from './EzIconPage';

export default async function LibPage({
  params,
}: {
  params: Promise<{ lib: LibId }>;
}) {
  const { lib } = await params;

  switch (lib) {
    case 'ez-tag':
      return <EzTagPage />;
    case 'ez-icon':
      return <EzIconPage />;
    default:
      notFound();
  }
}
