'use client';
import { EzTag, Main } from '@ezstart/ez-tag';
import Link from 'next/link';

const EzLibs = () => {
  return (
    <Main>
      <EzTag as='h1' className='bg-yellow-500'>
        EzLibs
      </EzTag>
      <h2 className='bg-red-500'>
        Check my libs, play with it and install them!
      </h2>
      <EzTag as='section' className=''>
        <EzTag as='h1'>EzTag</EzTag>
        <h2 className='text-3xl text-pink-600'>Test</h2>
        <EzTag as='h4'>
          EzTag is a React component library that provides a set of reusable
          components for building user interfaces. It's using TailwindCSS
        </EzTag>
        <EzTag as='button'>
          <Link href='http://localhost:3100/fr/ez-libs/ez-tag'>
            play with EzTag
          </Link>
        </EzTag>
      </EzTag>
      <EzTag as='section' className=''>
        <EzTag as='h3'>Other lib</EzTag>
        <EzTag as='h4'>Other lib description</EzTag>
      </EzTag>
    </Main>
  );
};

export default EzLibs;
