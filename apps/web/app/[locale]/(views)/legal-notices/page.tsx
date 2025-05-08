import { EzTag } from '@ezstart/ez-tag';
import { cn } from '@workspace/ui/lib/utils';
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
    <EzTag
      as='section'
      id='legal-notices'
      className={cn(
        'py-20 flex flex-col justify-center items-center px-6 bg-background min-h-screen '
      )}
    >
      <EzTag as='div' className='max-w-4xl mx-auto text-center space-y-6'>
        <EzTag
          as='h2'
          className='text-3xl md:text-4xl font-bold tracking-tight'
        >
          {t('title')}
        </EzTag>
        <EzTag as='p' className='text-lg text-muted-foreground'>
          {t('intro')}
        </EzTag>
      </EzTag>

      <EzTag as='div' className='max-w-4xl mx-auto mt-12 space-y-12'>
        {sections.map((section) => (
          <EzTag
            key={section.id}
            as='article'
            role='region'
            aria-labelledby={section.id}
            className='space-y-4'
          >
            <EzTag
              as='h3'
              id={section.id}
              variant='heading.secondary'
              className='text-2xl font-semibold'
              autoId
            >
              {section.title}
            </EzTag>
            <EzTag as='p' variant='text.body'>
              {section.content}
            </EzTag>
            {section.link && (
              <Link href={section.link.href} target='_blank'>
                {section.link.label}
              </Link>
            )}
          </EzTag>
        ))}
      </EzTag>
    </EzTag>
  );
};

export default LegalNoticesPage;
