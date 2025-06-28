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
import { useEffect, useRef } from 'react';
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

export const SkillsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const h2Observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('slideInFromLeft');
        }
      },
      { threshold: 1 }
    );

    const articleObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('slideInFromBottom');
          }
        });
      },
      { threshold: 0.5 }
    );

    if (sectionRef.current) {
      const h2 = sectionRef.current.querySelector('h2');
      if (h2) h2Observer.observe(h2);

      sectionRef.current
        .querySelectorAll('article')
        .forEach((el) => articleObserver.observe(el));
    }

    return () => {
      h2Observer.disconnect();
      articleObserver.disconnect();
    };
  }, []);

  return (
    <Section id='skills-section' ref={sectionRef}>
      <H2>Skills</H2>
      <UL
        layout='grid'
        className='md:grid-cols-2 lg:grid-cols-4 w-full'
        size={'xs'}
      >
        {skillData.skills.map((cat: SkillCategory, index) => (
          <LI key={index} className='items-start'>
            <article className='w-full'>
              <UL className='w-full'>
                <H3 size='h5'>{cat.category}</H3>
                {cat.items.map((item, idx) => (
                  <LI
                    key={idx}
                    className={'flex-nowrap whitespace-nowrap' + item.className}
                  >
                    {item.icon && <Icon name={item.icon as KnownIconName} />}
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
