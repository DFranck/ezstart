import { EzTag } from '@ezstart/ez-tag';
import { cn } from '@workspace/ui/lib/utils';
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
    <EzTag
      as='section'
      id='contact'
      className={cn(
        'py-20 flex flex-col justify-center items-center px-6 bg-background min-h-screen'
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

      <ul className='max-w-4xl mx-auto mt-12 space-y-4 text-center'>
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              className='text-lg font-medium hover:underline'
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </EzTag>
  );
};

export default ContactPage;
