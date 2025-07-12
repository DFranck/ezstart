'use client';

import { SkillShowcase } from '@/components/JobShowing';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { Div, H1, Section, TextGradient } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import ContactsList from '../contact/components/contactsList';

type Props = { id?: string };

const HeroSection = ({ id }: Props) => {
  const t = useTranslations('about');
  const { isMobile } = useDevice();
  const skillsShowcase = t.raw('skillsShowcase') as Array<{
    first: string;
    second: string;
  }>;

  const image = (
    <Image
      src='/images/franck_no_background.png'
      alt='Franck Dufournet'
      width={isMobile ? 150 : 500}
      height={isMobile ? 150 : 500}
      className='rounded-full object-cover shadow-md bg-primary z-10 ratio-square max-w-80'
    />
  );

  const content = (
    <>
      <H1 size={'giant'} className={cn(isMobile ? 'text-center' : 'text-wrap')}>
        <TextGradient from='ezstart' speed={5}>
          {t('title')}
        </TextGradient>
      </H1>
      <SkillShowcase skills={skillsShowcase} />
      <ContactsList />
    </>
  );

  return (
    <AuroraBackground id={id}>
      <Section
        size={isMobile ? 'xs' : 'full'}
        className={cn(isMobile && 'py-20')}
      >
        {isMobile ? (
          <Div size='xs'>
            {image}
            {content}
          </Div>
        ) : (
          <Div layout='row' className='max-w-4xl'>
            <Div size='xs'>{content}</Div>
            {image}
          </Div>
        )}
      </Section>
    </AuroraBackground>
  );
};

export default HeroSection;
