'use client';
import { Div, Section } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import { motion } from 'framer-motion';
import React from 'react';

export function LampDemo() {
  return (
    <LampContainer>
      <motion.h1
        initial={{ opacity: 0.5, y: 100 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.3,
          duration: 0.8,
          ease: 'easeInOut',
        }}
        className='mt-8 bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl'
      >
        Build lamps <br /> the right way
      </motion.h1>
    </LampContainer>
  );
}

export const LampContainer = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <Section className={cn('relative z-0 overflow-x-hidden', className)}>
      <div className='relative  flex flex-col items-center px-5 overflow-y-clip'>
        <div className='absolute top-0 left-0 right-0 z-0 flex w-full items-start justify-center   isolate'>
          <motion.div
            initial={{ opacity: 0.5, width: '15rem' }}
            whileInView={{ opacity: 1, width: '30rem' }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
            style={{
              backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
            }}
            className='absolute right-1/2 h-56 w-[30rem] bg-gradient-conic from-cyan-500 via-transparent to-transparent text-white [--conic-position:from_70deg_at_center_top]'
          >
            <div className='absolute w-full left-0 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]' />
            <div className='absolute w-40 h-full left-0 bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]' />
          </motion.div>

          <motion.div
            initial={{ opacity: 0.5, width: '15rem' }}
            whileInView={{ opacity: 1, width: '30rem' }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
            style={{
              backgroundImage: `conic-gradient(var(--conic-position), var(--tw-gradient-stops))`,
            }}
            className='absolute left-1/2 h-56 w-[30rem] bg-gradient-conic from-transparent via-transparent to-cyan-500 text-white [--conic-position:from_290deg_at_center_top]'
          >
            <div className='absolute w-full right-0 h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]' />
          </motion.div>

          <div className='absolute top-0 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md' />
          <div className='absolute top-0 z-50 h-36 w-[28rem] rounded-full bg-cyan-500 opacity-50 blur-3xl' />
          <motion.div
            initial={{ width: '8rem' }}
            whileInView={{ width: '16rem' }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
            className='absolute top-0 z-30 h-36 w-64 rounded-full bg-cyan-400 blur-2xl'
          />
          <motion.div
            initial={{ width: '15rem' }}
            whileInView={{ width: '30rem' }}
            transition={{ delay: 0.3, duration: 0.8, ease: 'easeInOut' }}
            className='absolute top-0 z-50 h-0.5 w-[30rem] bg-cyan-400'
          />
        </div>
        <Div className='z-50 min-h-80'>{children}</Div>
      </div>
    </Section>
  );
};
