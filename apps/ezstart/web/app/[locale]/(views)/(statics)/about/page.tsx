'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
  H1,
  H2,
  H3,
  Icon,
  LI,
  Main,
  P,
  Section,
  Span,
  UL,
} from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  const t = useTranslations('about');

  const timeline = t.raw('timeline') as TimelineItem[];
  const skills = t.raw('skills') as string[];
  const values = t.raw('values') as string[];
  const interests = t.raw('interests') as string[];

  return (
    <Main withHeaderOffset className='text-center'>
      {/* Intro */}
      <Section layout='grid'>
        <Div>
          <Image
            src='/images/franck_no_background.png'
            alt='Franck Dufournet'
            width={180}
            height={180}
            className='rounded-full shadow-md'
          />
        </Div>
        <Div className='text-justify'>
          <H1>{t('title')}</H1>
          <P>{t('intro')}</P>
          <P className='text-lg leading-relaxed'>{t('paragraph')}</P>
        </Div>
      </Section>

      {/* Timeline */}
      <Section>
        <H2 className='text-3xl font-semibold text-center'>
          {t('timelineTitle')}
        </H2>
        <UL size='default' className='relative border-l border-border'>
          {timeline.map((item) => (
            <LI key={item.year} layout='col' className='pl-6 relative'>
              <Icon
                name='fa:FaCircle'
                size={12}
                className='text-success absolute left-0 top-1.5'
              />
              <Span className='text-success font-mono'>{item.year}</Span>
              <H3 size='h5'>{item.title}</H3>
              <P variant='description'>{item.description}</P>
            </LI>
          ))}
        </UL>
      </Section>

      {/* Thématiques */}
      <Section>
        <H2>{t('approachTitle')}</H2>
        <Div layout='grid' className='md:grid-cols-3 lg:grid-cols-3'>
          <CardFactory title={t('skillsTitle')} items={skills} />
          <CardFactory title={t('valuesTitle')} items={values} />
          <CardFactory title={t('interestsTitle')} items={interests} />
        </Div>
      </Section>

      {/* Outro */}
      <Section>
        <H2>{t('outroTitle')}</H2>
        <P>{t('outroParagraph1')}</P>
        <P>{t('outroParagraph2')}</P>
        <P intent='info'>{t('outroCTA')}</P>

        <Div>
          <Link href='/contact'>
            <Button variant='default' size='lg'>
              {t('cta')}
            </Button>
          </Link>
        </Div>
      </Section>
    </Main>
  );
}

type TimelineItem = {
  year: string;
  title: string;
  description: string;
};

function CardFactory({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <UL layout='menu' size='xs'>
          {items.map((item) => (
            <LI key={item} className='flex items-start gap-2'>
              <Span className='text-success mt-[2px]'>▹</Span>
              <Span>{item}</Span>
            </LI>
          ))}
        </UL>
      </CardContent>
    </Card>
  );
}
