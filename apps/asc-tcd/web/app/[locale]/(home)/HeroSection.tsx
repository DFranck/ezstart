'use client';

import { H1, P, Section } from '@ezstart/ui/components';

type Props = { id?: string };

const HeroSection = ({ id }: Props) => {
  return (
    <Section size={'xl'} className='relative max-w-none text-white'>
      <video
        src={'/videos/hero-background.mp4'}
        autoPlay
        loop
        muted
        playsInline
        className='absolute top-0 left-0 w-full h-full object-cover -z-0'
      />
      <H1 className='z-10 md:text-center'>ASC</H1>
      <P className='z-10'>Solution environmental pensée et crées pour vous</P>
    </Section>
  );
};

export default HeroSection;
