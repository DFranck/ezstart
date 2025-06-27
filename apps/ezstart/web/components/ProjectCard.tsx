'use client';

import { LI } from '@ezstart/ui/components';
import Image from 'next/image';

type ProjectCardProps = {
  title: string;
  subtitle?: string;
  description: string;
  link?: string | null;
  image?: string;
  tech?: string[];
  private?: boolean;
};

export function ProjectCard({
  title,
  subtitle,
  description,
  link,
  image,
  tech,
  private: isPrivate,
}: ProjectCardProps) {
  return (
    <LI variant={'outline'} layout={'col'} className='p-6'>
      {image && (
        <div className='relative w-full h-40 mb-4 rounded overflow-hidden'>
          <Image
            src={image}
            alt={title}
            fill
            className='object-cover'
            sizes='(min-width: 768px) 50vw, 100vw'
          />
        </div>
      )}

      <div className='flex-1'>
        <h3 className='text-xl font-bold text-gray-800 dark:text-white mb-1'>
          {title}
        </h3>
        {subtitle && (
          <p className='text-sm text-gray-500 dark:text-gray-400 mb-1'>
            {subtitle}
          </p>
        )}
        <p className='text-gray-600 dark:text-gray-400 text-sm'>
          {description}
        </p>

        {Array.isArray(tech) && tech.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400'>
            {tech.map((t) => (
              <span
                key={t}
                className='px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800'
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className='mt-4'>
        {link ? (
          <a
            href={link}
            target='_blank'
            rel='noopener noreferrer'
            className='text-cyan-600 text-sm hover:underline'
          >
            Voir le projet →
          </a>
        ) : isPrivate ? (
          <span className='text-sm text-gray-400 italic'>Projet privé</span>
        ) : null}
      </div>
    </LI>
  );
}
