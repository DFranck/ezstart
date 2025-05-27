'use client';
import {
  Button,
  H1,
  Icon,
  Li,
  Main,
  P,
  Section,
  Ul,
} from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

type ContactLink = {
  label: 'Github' | 'Linkedin' | 'Mail';
  href: string;
};

const ContactPage = () => {
  const t = useTranslations('contact');
  const links = t.raw('links') as ContactLink[];

  return (
    <Main withFixedHeader>
      <Section>
        <H1>{t('title')}</H1>
        <P>{t('intro')}</P>
        <Ul layout={'grid'}>
          {links.map((link, i, arr) => (
            <Li
              className={cn('', {
                'md:col-span-2': arr.length % 2 !== 0 && i === arr.length - 1,
              })}
              key={link.href}
              asChild
            >
              <Button
                asChild
                variant={`${link.label === 'Mail' ? 'outline' : link.label === 'Github' ? 'default' : link.label === 'Linkedin' ? 'linkedin' : 'default'}`}
                className={cn(`justify-center`, {})}
              >
                <Link
                  href={link.href}
                  target={link.href.startsWith('http') ? '_blank' : undefined}
                >
                  <Icon name={`lucide:${link.label}`} size={20} />
                  {link.label}
                </Link>
              </Button>
            </Li>
          ))}
        </Ul>
      </Section>
    </Main>
  );
};

export default ContactPage;
