'use client';
import { EzTag, Main } from '@ezstart/ez-tag';
const EzIconPage = () => {
  return (
    <Main withHeader>
      <EzTag as='section' className=''>
        <EzTag as='h1'>icon</EzTag>
        <EzTag as='h2'>Headings</EzTag>
      </EzTag>
    </Main>
  );
};

export default EzIconPage;
