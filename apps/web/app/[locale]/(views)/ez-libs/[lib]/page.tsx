import { notFound } from 'next/navigation';
import { LibId } from '../libData';
import EzTagPage from './(eztag)/EzTagPage';
import IconPage from './IconPage';

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
      return <IconPage />;
    default:
      notFound();
  }
}
