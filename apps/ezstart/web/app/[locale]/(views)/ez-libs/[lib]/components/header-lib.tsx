import { getMeta } from '@/utils/get-meta';
import {
  Button,
  Div,
  H1,
  H3,
  Icon,
  Section,
  Span,
} from '@ezstart/ui/components';
import Link from 'next/link';

export const HeaderLib = ({ lib }: { lib: LibId }) => {
  const { name, description, github, status } = getMeta('lib', lib);
  return (
    <Section layout={'grid'} size='lg'>
      <Span>
        <H1>{name}</H1>
      </Span>
      <Div>
        <H3>{description}</H3>
        {github && (
          <Button asChild>
            <Link target='_blank' rel='noopener noreferrer' href={github}>
              <Icon name='lucide:Github' />
              README
            </Link>
          </Button>
        )}
      </Div>
    </Section>
  );
};
