import { Div, H2, H3, P, Section } from '@ezstart/ez-tag';
import { cn } from '@ezstart/ui/src/lib/utils';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
type LegalSection = {
  id: string;
  title: string;
  content: string;
  link?: { label: string; href: string };
};
const LegalNoticesPage = () => {
  const t = useTranslations('legal-notices');
  const sections = t.raw('sections') as LegalSection[];

  return (
    <Section
      id='legal-notices'
      className={cn(
        'py-20 flex flex-col justify-center items-center px-6 bg-background min-h-screen '
      )}
    >
      <Div className='max-w-4xl mx-auto text-center space-y-6'>
        <H2>{t('title')}</H2>
        <P>{t('intro')}</P>
      </Div>

      <Div className='max-w-4xl mx-auto mt-12 space-y-12'>
        {sections.map((section) => (
          <article
            key={section.id}
            role='region'
            aria-labelledby={section.id}
            className='space-y-4'
          >
            <H3 id={section.id}>{section.title}</H3>
            <P>{section.content}</P>
            {section.link && (
              <Link href={section.link.href} target='_blank'>
                {section.link.label}
              </Link>
            )}
          </article>
        ))}
      </Div>
    </Section>
  );
};

export default LegalNoticesPage;
