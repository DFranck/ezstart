'use cLIent';
import {
  Div,
  H1,
  H2,
  H4,
  LI,
  Main,
  P,
  Section,
  UL,
} from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/Lib';

import { useTranslations } from 'next-intl';
type TimeLIneItem = {
  year: string;
  title: string;
  description: string;
};
export const page = () => {
  const t = useTranslations('about');
  const timeLIne = t.raw('timeLIne') as TimeLIneItem[];
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
        <H2>{t('timeLIneTitle')}</H2>
        <UL>
          {timeLIne.map((item) => (
            <LI key={item.year} className='gap-4'>
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
      <Section aria-labelledby='about-title' id='about'>
        <UL layout='grid'>
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
            <LI
              key={cat.title}
              className={cn('p-2', {
                'md:col-span-2': arr.length % 2 !== 0 && i === arr.length - 1,
              })}
            >
              <Div className='w-fULl flex flex-col items-center gap-2'>
                <H4>{cat.title}</H4>

                <UL className='flex flex-wrap justify-center gap-2 w-fULl'>
                  {cat.items.map((item) => (
                    <LI
                      key={item}
                      className="before:content-['▹'] before:text-green-400 before:mr-1 text-base"
                    >
                      {item}
                    </LI>
                  ))}
                </UL>
              </Div>
            </LI>
          ))}
        </UL>
      </Section>
    </Main>
  );
};
