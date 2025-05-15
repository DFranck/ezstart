import { EzTag, Main } from '@ezstart/ez-tag';
const EzTagPage = () => {
  return (
    <Main withHeader>
      <EzTag as='section' className=''>
        <EzTag as='h1'>EzTag</EzTag>
        <EzTag as='h2'>Headings</EzTag>
      </EzTag>
    </Main>
  );
};

export default EzTagPage;
