'use client';

import { LampContainer } from '@/components/ui/lamp';
import { Button, H2, Icon, P, Section, Ul } from '@ezstart/ui';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const SectionContact = () => {
  const t = useTranslations('section-contact');

  return (
    <LampContainer>
      <Section className='items-center' size={'lg'}>
        <H2>{t('title')}</H2>

        <P>{t('description')}</P>

        <Ul layout={'inline'}>
          <Button>
            <Link href='/contact'>{t('cta')}</Link>
          </Button>
          <Button asChild variant={'outline'}>
            <Link
              href='https://github.com/DFranck/ez-start'
              target='_blank'
              rel='noopener noreferrer'
            >
              <Icon name='fa:FaGithub' size={20} />
              {t('github')}
            </Link>
          </Button>
        </Ul>
      </Section>
    </LampContainer>
  );
};
