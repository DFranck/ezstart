import { notFound } from 'next/navigation';
import IconPage from './(icon)/page-icon';
import TagPage from './(tag)/page-tag';
import { LibId } from './types';

export default async function LibPage({
  params,
}: {
  params: Promise<{ lib: LibId }>;
}) {
  const { lib } = await params;

  switch (lib) {
    case 'tag':
      return <TagPage />;
    case 'icon':
      return <IconPage />;
    default:
      notFound();
  }
}
