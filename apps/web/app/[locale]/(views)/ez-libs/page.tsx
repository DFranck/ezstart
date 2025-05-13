import { EzTag } from '@ezstart/ez-tag';
import Link from 'next/link';

const EzLibs = () => {
  return (
    <EzTag as='div'>
      <EzTag as='h1'>EzLibs</EzTag>
      <EzTag as='h2'>Check my libs, play with it and install them!</EzTag>
      <EzTag as='section' className=''>
        <EzTag as='h1'>EzTag</EzTag>
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
    </EzTag>
  );
};

export default EzLibs;
