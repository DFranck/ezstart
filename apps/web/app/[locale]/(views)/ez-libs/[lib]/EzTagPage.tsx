import { EzTag } from '@ezstart/ez-tag';
import {
  HeadingTag,
  headingTags,
} from '@ezstart/ez-tag/src/classNames/headings';
const EzTagPage = () => {
  return (
    <EzTag as='div' variant={'page'}>
      <EzTag as='section' className=''>
        <EzTag as='h1'>EzTag</EzTag>
        <EzTag as='h2'>Headings</EzTag>
        {headingTags.map((level: HeadingTag) => (
          <EzTag key={level} as={level}>
            {`This is a ${level.toUpperCase()}`}
          </EzTag>
        ))}
      </EzTag>
    </EzTag>
  );
};

export default EzTagPage;
