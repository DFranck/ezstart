'use client';

import { FlippingGallery } from '@/components/ui/flipping-gallery';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
import { useTranslations } from 'next-intl';

type Props = {
  id?: string;
};

const LibsSection = ({ id }: Props) => {
  const t = useTranslations('libraries');
  return (
    <MacbookScroll
      title={t('title')}
      content={<FlippingGallery items={t.raw('items')} autoplay />}
    />
  );
};

export default LibsSection;
