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
        <EzTag as='h1' variant='heading.primary'>
          {t('title')}
        </EzTag>
        <EzTag as='p' variant='text.body'>
          {t('intro')}
        </EzTag>
      </EzTag>

      {/* Timeline */}
      <EzTag as='div' className='max-w-4xl mx-auto mt-16 space-y-8'>
        <EzTag as='h2' variant='heading.secondary' autoId>
          {t('timelineTitle')}
        </EzTag>
        <EzTag as='ul' className='space-y-6'>
          {timeline.map((item) => (
            <EzTag as='li' key={item.year} className='flex'>
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
            </EzTag>
          ))}
        </EzTag>
      </EzTag>

      {/* Skills / Values / Interests */}
      <EzTag
        as='div'
        className='max-w-4xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-3 gap-12 text-center'
      >
        {/* Skills */}
        <EzTag as='div'>
          <EzTag as='h2' variant='heading.secondary' autoId>
            {t('skillsTitle')}
          </EzTag>
          <EzTag as='ul' className='mt-4 space-y-2'>
            {skills.map((s) => (
              <EzTag
                as='li'
                key={s}
                className="before:content-['▹'] before:text-green-400 before:mr-2 inline-block"
              >
                {s}
              </EzTag>
            ))}
          </EzTag>
        </EzTag>

        {/* Values */}
        <EzTag as='div'>
          <EzTag as='h2' variant='heading.secondary' autoId>
            {t('valuesTitle')}
          </EzTag>
          <EzTag as='ul' className='mt-4 space-y-2'>
            {values.map((v) => (
              <EzTag
                as='li'
                key={v}
                className="before:content-['▹'] before:text-green-400 before:mr-2 inline-block"
              >
                {v}
              </EzTag>
            ))}
          </EzTag>
        </EzTag>

        {/* Interests */}
        <EzTag as='div'>
          <EzTag as='h2' variant='heading.secondary' autoId>
            {t('interestsTitle')}
          </EzTag>
          <EzTag as='ul' className='mt-4 space-y-2'>
            {interests.map((i) => (
              <EzTag
                as='li'
                key={i}
                className="before:content-['▹'] before:text-green-400 before:mr-2 inline-block"
              >
                {i}
              </EzTag>
            ))}
          </EzTag>
        </EzTag>
      </EzTag>
    </EzTag>
  );
};

export default page;
