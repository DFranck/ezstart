'use client';
import { H1, Li, Main, P, Section, Ul } from '@ezstart/ui/components';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

type ContactLink = {
  label: string;
  href: string;
};

const ContactPage = () => {
  const t = useTranslations('contact');
  const links = t.raw('links') as ContactLink[];

  return (
    <Main withFixedHeader>
      <Section className='text-center'>
        <H1>{t('title')}</H1>
        <P>{t('intro')}</P>
      </Section>
      <Section>
        <Ul >
          {links.map((link) => (
            <Li variant={'card'} key={link.href} asChild>
              <Link
                href={link.href}
                target={link.href.startsWith('http') ? '_blank' : undefined}
                className='text-lg font-medium hover:underline'
              >
                {link.label}
              </Link>
            </Li>
          ))}
        </Ul>
      </Section>
    </Main>
  );
};

export default ContactPage;
