import { MacbookScroll } from '@/components/ui/macbook-scroll';
import { Div } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';

type Props = {
  id?: string;
};

const LibsSection = ({ id }: Props) => {
  const t = useTranslations('LibsSection');
  return (
    <MacbookScroll
      title={t('title')}
      content={<Div size={'xs'}>Here is my libs</Div>}
    />
  );
};

export default LibsSection;
