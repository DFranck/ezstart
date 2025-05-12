import { EzTag } from '@ezstart/ez-tag';
import { cn } from '@workspace/ui/lib/utils';
import { useTranslations } from 'next-intl';
type TimelineItem = {
  year: string;
  title: string;
  description: string;
};
const page = () => {
  const t = useTranslations('about');
  const timeline = t.raw('timeline') as TimelineItem[];
  const skills = t.raw('skills') as string[];
  const values = t.raw('values') as string[];
  const interests = t.raw('interests') as string[];

  return (
    <EzTag
      as='section'
      id='about'
      className={cn('py-20 px-6 bg-background text-muted-foreground')}
    >
      {/* Hero */}
      <EzTag as='div' className='max-w-3xl mx-auto text-center space-y-4'>
        <EzTag as='h1'>{t('title')}</EzTag>
        <EzTag as='p'>{t('intro')}</EzTag>
      </EzTag>

      {/* Timeline */}
      <EzTag as='div' className='max-w-4xl mx-auto mt-16 space-y-8'>
        <EzTag as='h2'>{t('timelineTitle')}</EzTag>
        <ul className='space-y-6'>
          {timeline.map((item) => (
            <li key={item.year} className='flex'>
              <EzTag as='span' className='w-20 font-mono text-green-400'>
                {item.year}
              </EzTag>
              <EzTag as='div' className='ml-4 space-y-1'>
                <EzTag as='h3' variant='heading.tertiary'>
                  {item.title}
                </EzTag>
                <EzTag as='p' variant='text.body'>
                  {item.description}
                </EzTag>
              </EzTag>
            </li>
          ))}
        </ul>
      </EzTag>

      {/* Skills / Values / Interests */}
      <EzTag
        as='div'
        className='max-w-4xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 text-center'
      >
        {/* Skills */}
        <EzTag as='div'>
          <EzTag as='h2' variant='heading.secondary'>
            {t('skillsTitle')}
          </EzTag>
          <ul className='mt-4 space-y-2'>
            {skills.map((s) => (
              <li
                key={s}
                className="before:content-['▹'] before:text-green-400 before:mr-2 inline-block"
              >
                {s}
              </li>
            ))}
          </ul>
        </EzTag>

        {/* Values */}
        <EzTag as='div'>
          <EzTag as='h2' variant='heading.secondary'>
            {t('valuesTitle')}
          </EzTag>
          <ul className='mt-4 space-y-2'>
            {values.map((v) => (
              <li
                key={v}
                className="before:content-['▹'] before:text-green-400 before:mr-2 inline-block"
              >
                {v}
              </li>
            ))}
          </ul>
        </EzTag>

        {/* Interests */}
        <EzTag as='div'>
          <EzTag as='h2' variant='heading.secondary'>
            {t('interestsTitle')}
          </EzTag>
          <ul className='mt-4 space-y-2'>
            {interests.map((i) => (
              <li
                key={i}
                className="before:content-['▹'] before:text-green-400 before:mr-2 inline-block"
              >
                {i}
              </li>
            ))}
          </ul>
        </EzTag>
      </EzTag>
    </EzTag>
  );
};

export default page;
