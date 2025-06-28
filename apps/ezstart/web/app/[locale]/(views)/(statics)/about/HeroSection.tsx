import { SkillShowcase } from '@/components/JobShowing';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
import {
  Div,
  H1,
  Icon,
  P,
  Section,
  TextGradient,
} from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const HeroSection = () => {
  const t = useTranslations('about');
  const skillsShowcase = t.raw('skillsShowcase') as Array<{
    first: string;
    second: string;
  }>;
  return (
    <Section size={'full'}>
      <MacbookScroll
        badge={<Icon name='custom:Ezstart' size={40} />}
        content={
          <Div size='xs' layout={'row'}>
            <Div size={'xs'} className='items-start'>
              <Div layout={'row'} size={'default'}>
                <Div size={'default'} className='items-start'>
                  <P size={'xs'} className='hello'>
                    {t('intro')}
                  </P>
                  <H1>
                    <TextGradient from='ezstart' to='ring' speed={5}>
                      {t('title')}
                    </TextGradient>
                  </H1>
                </Div>
                <Image
                  src='/images/franck_no_background.png'
                  alt='Franck Dufournet'
                  width={150}
                  height={150}
                  className='rounded-full object-cover shadow-md bg-primary'
                  sizes='h-full w-full'
                />
              </Div>
              <SkillShowcase skills={skillsShowcase} />
            </Div>
          </Div>
        }
      />
    </Section>
  );
};

export default HeroSection;
