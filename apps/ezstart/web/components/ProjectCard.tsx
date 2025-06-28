'use client';

import { H3, LI, P, UL } from '@ezstart/ui/components';
import Image from 'next/image';
import Link from 'next/link';

type ProjectCardProps = {
  title: string;
  subtitle?: string;
  description: string;
  link?: string | null;
  src?: string;
  tech?: string[];
  private?: boolean;
};

export function ProjectCard({
  title,
  subtitle,
  description,
  link,
  src,
  tech,
  private: isPrivate,
}: ProjectCardProps) {
  return (
    <LI variant={'outline'} layout={'col'} className='p-6'>
      {src && (
        <div className='relative w-full h-40 mb-4 rounded overflow-hidden'>
          <Image
            src={src}
            alt={title}
            fill
            className='object-cover'
            sizes='(min-width: 768px) 50vw, 100vw'
          />
        </div>
      )}

      <div className='flex-1'>
        <H3 size={'h5'}>{title}</H3>
        {subtitle && (
          <P variant={'description'} size={'xs'}>
            {subtitle}
          </P>
        )}
        <P size={'xs'} className='text-justify py-4'>
          {description}
        </P>

        {Array.isArray(tech) && tech.length > 0 && (
          <UL className='text-xs' size={'default'} layout={'row'}>
            {tech.map((t) => (
              <LI
                variant={'card'}
                size={'default'}
                className='py-1 px-2 whitespace-nowrap'
                key={t}
              >
                {t}
              </LI>
            ))}
          </UL>
        )}
      </div>

      <div className='mt-4'>
        {link ? (
          <Link
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-cyan-600 text-sm hover:underline'
          >
            Voir le projet →
          </Link>
        ) : isPrivate ? (
          <P variant={'description'}>Projet privé</P>
        ) : null}
      </div>
    </LI>
  );
}
