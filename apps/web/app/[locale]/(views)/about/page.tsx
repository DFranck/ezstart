'use client';
import { cn, EzTag, H1, H2, H4, Li, Main, P, Section, Ul } from '@ezstart/ui';
import { useTranslations } from 'next-intl';
type TimelineItem = {
  year: string;
  title: string;
  description: string;
};
const page = () => {
  const t = useTranslations('about');
  const timeline = t.raw('timeline') as TimelineItem[];
  const skills = t.raw('skills') as string[];
  const values = t.raw('values') as string[];
  const interests = t.raw('interests') as string[];

  return (
    <Main className='py-20 mt-10'>
      <Section size={'lg'}>
        <H1>{t('title')}</H1>
        <P>{t('intro')}</P>
      </Section>
      <Section>
        <H2>{t('timelineTitle')}</H2>
        <Ul className='space-y-8'>
          {timeline.map((item) => (
            <Li key={item.year} className='flex'>
              <div className='w-20 flex items-center justify-center font-mono text-green-400'>
                {item.year}
              </div>
              <div className='space-y-1'>
                <H4>{item.title}</H4>
                <P>{item.description}</P>
              </div>
            </Li>
          ))}
        </Ul>
      </Section>
      <Section
        id='about'
        className={cn(
          'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-20 py-20'
        )}
      >
        {/* Skills */}
        <div className='text-center'>
          <H4>{t('skillsTitle')}</H4>
          <ul className='mt-4 space-y-2'>
            {skills.map((s) => (
              <li
                key={s}
                className="before:content-['▹'] before:text-green-400 before:mr-1 inline-block"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>

        {/* Values */}
        <EzTag as='div' className='text-center'>
          <H4>{t('valuesTitle')}</H4>
          <ul className='mt-4 space-y-2'>
            {values.map((v) => (
              <li
                key={v}
                className="before:content-['▹'] before:text-green-400 before:mr-1 inline-block"
              >
                {v}
              </li>
            ))}
          </ul>
        </EzTag>

        {/* Interests */}
        <EzTag
          as='div'
          className='md:col-span-2 text-center xl:col-span-1 xl:text-left'
        >
          <H4>{t('interestsTitle')}</H4>
          <ul className='mt-4 space-y-2'>
            {interests.map((i) => (
              <li
                key={i}
                className="before:content-['▹'] before:text-green-400 before:mr-1 inline-block"
              >
                {i}
              </li>
            ))}
          </ul>
        </EzTag>
      </Section>
    </Main>
  );
};

export default page;
