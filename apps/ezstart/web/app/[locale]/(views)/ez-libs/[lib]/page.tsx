import { notFound } from 'next/navigation';
import { LibId } from '../libData';
import TagPage from './(tag)/page-tag';
import IconPage from './page-icon';

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
