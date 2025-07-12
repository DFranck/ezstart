// components/Skills.tsx
import {
  H2,
  H3,
  Icon,
  KnownIconName,
  LI,
  Section,
  UL,
} from '@ezstart/ui/components';
import { useDevice } from '@ezstart/ui/hooks';
import skillData from './skills.json';

type SkillCategory = {
  category: string;
  items: {
    name: string;
    className?: string;
    icon?: string;
    iconProps?: string;
    imgProps?: string;
  }[];
};

type Props = {
  id?: string;
};

export const SkillsSection = ({ id }: Props) => {
  const { isMobile } = useDevice();

  return (
    <Section id={id} size={isMobile ? 'xs' : 'lg'}>
      <H2>Skills</H2>
      <UL
        layout='grid'
        className='grid-cols-2 md:grid-cols-4 lg:grid-cols-4 w-full'
        size={'xs'}
      >
        {skillData.skills.map((cat: SkillCategory, index) => (
          <LI key={index} className='items-start'>
            <article className='w-full'>
              <UL className='w-full py-4 px-2 md:py-4 ' size={'xs'}>
                <H3 size='h5' className='text-center md:text-start'>
                  {cat.category}
                </H3>
                {cat.items.map((item, idx) => (
                  <LI
                    key={idx}
                    className={'flex-nowrap whitespace-nowrap' + item.className}
                  >
                    {item.icon && (
                      <Icon size={20} name={item.icon as KnownIconName} />
                    )}
                    {item.name}
                  </LI>
                ))}
              </UL>
            </article>
          </LI>
        ))}
      </UL>
    </Section>
  );
};
