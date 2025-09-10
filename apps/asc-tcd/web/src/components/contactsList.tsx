import { Button, Icon, isValidIconName, LI, UL } from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import { cn } from '@ezstart/ui/lib';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

type Props = { className?: string };

const ContactsList = ({ className }: Props) => {
  const { isMobile } = useDevice();
  const t = useTranslations('contact');
  const links = t.raw('links') as {
    label: string;
    href: string;
    icon: string;
  }[];

  return (
    <UL
      size={'default'}
      className={cn(
        'w-full mt-2 z-10',
        { 'justify-center': isMobile },
        className
      )}
      layout={'row'}
    >
      {links.map((link) => (
        <LI key={link.href}>
          <Button asChild size={'sm'}>
            <Link href={link.href} target='_blank' rel='noopener noreferrer'>
              {isValidIconName(link.icon) ? (
                <Icon name={link.icon} />
              ) : (
                <Icon name='lucide:Link' />
              )}
              {!isMobile && link.label}
            </Link>
          </Button>
        </LI>
      ))}
    </UL>
  );
};

export default ContactsList;
