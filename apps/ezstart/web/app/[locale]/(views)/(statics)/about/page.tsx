'use client';
import {
  Dd,
  Dl,
  Dt,
  H1,
  H2,
  H4,
  Li,
  Main,
  P,
  Section,
} from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';

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
    <Main withHeaderOffset>
      <Section>
        <H1>{t('title')}</H1>
        <P>{t('intro')}</P>
      </Section>
      <Section>
        <H2>{t('timelineTitle')}</H2>
        <UL>
          {timeline.map((item) => (
            <LIkey={item.year} className='gap-4'>
              <div className='pt-2 flex items-start justify-center font-mono text-green-400'>
                {item.year}
              </div>
              <div className='space-y-1'>
                <H4>{item.title}</H4>
                <P>{item.description}</P>
              </div>
            </LI>
          ))}
        </UL>
      </Section>
      <Section aria-labelledby='about-title' id='about' size='full'>
        <UL layout='grid' size={'full'}>
          {[
            {
              title: t('skillsTitle'),
              items: skills,
            },
            {
              title: t('valuesTitle'),
              items: values,
            },
            {
              title: t('interestsTitle'),
              items: interests,
            },
          ].map((cat, i, arr) => (
            <Li
              key={cat.title}
              align='center'
              className={cn('p-2', {
                'md:col-span-2': arr.length % 2 !== 0 && i === arr.length - 1,
              })}
            >
              <Dl
                size='full'
                className='w-full flex flex-col items-center gap-2'
              >
                <Dt>
                  <H4>{cat.title}</H4>
                </Dt>
                <div className='flex flex-wrap justify-center gap-2 w-full'>
                  {cat.items.map((item) => (
                    <Dd
                      key={item}
                      wrap='inline'
                      marker='default'
                      className="before:content-['▹'] before:text-green-400 before:mr-1 text-base"
                    >
                      {item}
                    </Dd>
                  ))}
                </div>
              </Dl>
            </LI>
          ))}
        </UL>
      </Section>
    </Main>
  );
};

export default page;
