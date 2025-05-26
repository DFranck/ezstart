import { notFound } from 'next/navigation';
import { LibId } from '../libData';
import TagPage from './(eztag)/page-tag';
import IconPage from './IconPage';

export default async function LibPage({
  params,
}: {
  params: Promise<{ lib: LibId }>;
}) {
  const { lib } = await params;

  switch (lib) {
    case 'ez-tag':
      return <TagPage />;
    case 'icon':
      return <IconPage />;
    default:
      notFound();
  }
}
