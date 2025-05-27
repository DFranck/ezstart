import { LibId } from '@/components/layout/section/section-lib';
import { notFound } from 'next/navigation';
import IconPage from './(icon)/page-icon';
import TagPage from './(tag)/page-tag';

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
