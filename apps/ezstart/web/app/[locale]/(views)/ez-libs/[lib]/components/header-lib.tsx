import { getMeta } from '@/utils/get-meta';
import { Button, H1, H2, H3, Icon, P, Section } from '@ezstart/ui/components';
import Link from 'next/link';
import { LibId } from '../types';

export const HeaderLib = ({ lib }: { lib: LibId }) => {
  const { name, description, github, status } = getMeta('lib', lib);
  return (
    <Section>
      <H1>{name}</H1>
      <H3>{description}</H3>
      {github && (
        <Button asChild>
          <Link target='_blank' rel='noopener noreferrer' href={github}>
            <Icon name='lucide:Github' />
            README
          </Link>
        </Button>
      )}
      {status === 'in progress' && (
        <Section intent={'warning'} size={'sm'}>
          <H2>{status}</H2>
          <Icon name='lucide:LucideLoaderCircle' spin />
          <P>This lib is still in progress, thanks for your patience</P>
        </Section>
      )}
    </Section>
  );
};
