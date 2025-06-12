import { Main } from '@ezstart/ui/components';
import DivPlayground from './playground/div-playground';
import { HeadingPlayground } from './playground/heading-playground';
import SectionPlayground from './playground/section-playground';

const page = async ({ params }: { params: Promise<{ tag: string }> }) => {
  const { tag } = await params;

  return (
    <Main withHeaderOffset>
      {tag === 'section' && <SectionPlayground />}
      {tag === 'div' && <DivPlayground />}
      {tag === 'h1' && <HeadingPlayground />}
    </Main>
  );
};

export default page;
