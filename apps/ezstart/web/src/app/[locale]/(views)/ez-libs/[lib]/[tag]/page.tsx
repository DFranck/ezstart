import { Main } from '@ezstart/ui/components';
import DivPlayground from './playground/div-playground';
import { HeadingPlayground } from './playground/heading-playground';
import ListingPlayground from './playground/listing-playground';
import PPlayground from './playground/p-playground';
import SectionPlayground from './playground/section-playground';
import SpanPlayground from './playground/span-playground';

const page = async ({ params }: { params: Promise<{ tag: string }> }) => {
  const { tag } = await params;

  return (
    <Main withHeaderOffset>
      {tag === 'section' && <SectionPlayground />}
      {tag === 'div' && <DivPlayground />}
      {tag === 'p' && <PPlayground />}
      {tag === 'span' && <SpanPlayground />}
      {tag === 'heading' && <HeadingPlayground />}
      {tag === 'listing' && <ListingPlayground />}
    </Main>
  );
};

export default page;
