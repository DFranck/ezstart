'use client';

import { useDevice } from '../hooks/use-device';
import { cn } from '../lib/utils';
import { H1, P, Section } from './tag';
import { Div } from './tag/src/aliases';

type HeroLayout = 'center' | 'grid';
type HeroMediaPosition = 'left' | 'right';

type HeroSectionProps = {
  id?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  layout?: HeroLayout; // <--- NEW
  mediaPosition?: HeroMediaPosition; // <--- NEW
  videoSrc?: string;
  imageSrc?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  paragraph?: React.ReactNode;
  overlay?: boolean;
  children?: React.ReactNode;
};

export const Hero = ({
  id,
  size = 'full',
  className,
  layout = 'center', // default centré
  mediaPosition = 'left',
  videoSrc,
  imageSrc,
  title,
  subtitle,
  paragraph,
  overlay = true,
  children,
}: HeroSectionProps) => {
  const { isMobile } = useDevice();

  // 🖼️ Le bloc média (image ou vidéo)
  const Media = (
    <>
      {videoSrc ? (
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className='absolute top-0 left-0 w-full h-full object-cover'
        />
      ) : imageSrc ? (
        <img
          src={imageSrc}
          alt='Hero background'
          className='absolute top-0 left-0 w-full h-full object-cover'
        />
      ) : null}
      {overlay && <div className='absolute inset-0 bg-black/40' />}
    </>
  );

  // 📝 Le bloc texte
  const TextContent = (
    <Div
      className={cn(
        'relative z-10 text-center md:text-left space-y-4 p-6 md:p-10',
        { 'text-white': videoSrc || imageSrc }
      )}
    >
      {subtitle && (
        <P className='uppercase tracking-widest text-sm'>{subtitle}</P>
      )}
      {title && <H1 className='md:text-center'>{title}</H1>}
      {paragraph && <P className='max-w-2xl'>{paragraph}</P>}
      {children}
    </Div>
  );

  return (
    <Section
      id={id}
      size={size}
      className={cn('relative max-w-none overflow-hidden', className)}
    >
      {/* ✅ Mode center : média en arrière-plan */}
      {layout === 'center' && (
        <>
          {Media}
          <div className='absolute inset-0 flex items-center justify-center'>
            {TextContent}
          </div>
        </>
      )}

      {/* ✅ Mode grid : média et texte côte à côte */}
      {layout === 'grid' && (
        <div className='grid grid-cols-1 md:grid-cols-2 h-full'>
          {/* Si mediaPosition = left alors image à gauche, sinon à droite */}
          {mediaPosition === 'left' && (
            <>
              <div className='relative min-h-[40vh] md:min-h-[60vh]'>
                {Media}
              </div>
              <div className='flex items-center justify-center'>
                {TextContent}
              </div>
            </>
          )}
          {mediaPosition === 'right' && (
            <>
              <div className='flex items-center justify-center'>
                {TextContent}
              </div>
              <div className='relative min-h-[40vh] md:min-h-[60vh]'>
                {Media}
              </div>
            </>
          )}
        </div>
      )}
    </Section>
  );
};

export default Hero;
