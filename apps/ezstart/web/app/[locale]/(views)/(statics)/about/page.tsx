'use client';

import { FlippingGallery } from '@/components/ui/flipping-gallery';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Div,
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
import Link from 'next/link';
import HeroSection from './HeroSection';
import { SkillsSection } from './SkillsSection';

export default function AboutPage() {
  const t = useTranslations('about');
  const p = useTranslations('ProjectsSection');
  const projects = p.raw('projects') as {
    title: string;
    subtitle?: string;
    description: string;
    link: string | null;
    src: string;
    tech?: string[];
    private?: boolean;
  }[];
  const timeline = (t.raw('timeline') ?? []) as TimelineItem[];

  return (
    <Main>
      <HeroSection />
      <SkillsSection />
      <FlippingGallery items={projects} />
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
