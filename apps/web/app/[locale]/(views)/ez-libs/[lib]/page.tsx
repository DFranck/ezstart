import { notFound } from 'next/navigation';
import { LibId } from '../libData';
import EzIconPage from './EzIconPage';
import EzTagPage from './EzTagPage';

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
