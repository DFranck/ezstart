import { getMeta } from '@/utils/get-meta';
import {
  Button,
  H1,
  H3,
  H6,
  Icon,
  Section,
  Span,
} from '@ezstart/ui/components';
import Link from 'next/link';
import { LibId } from '../types';

export const HeaderLib = ({ lib }: { lib: LibId }) => {
  const { name, description, github, status } = getMeta('lib', lib);
  return (
    <Section>
      <Span>
        <H1>{name}</H1>
        {status === 'in progress' && (
          <Span intent={'warning'}>
            <H6>{status}</H6>
            <Icon name='lucide:LucideLoaderCircle' spin />
          </Span>
        )}
      </Span>
      <H3>{description}</H3>
      {github && (
        <Button asChild>
          <Link target='_blank' rel='noopener noreferrer' href={github}>
            <Icon name='lucide:Github' />
            README
          </Link>
        </Button>
      )}
    </Section>
  );
};
