'use client';
import { Div, H2, H3 } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';
import { useEffect, useState } from 'react';

type Skill = {
  first: string;
  second: string;
};

type SkillShowcaseProps = {
  skills: Skill[];
};

export function SkillShowcase({ skills }: SkillShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimate(false);

      setTimeout(() => {
        setIndex((prevIndex) => (prevIndex + 1) % skills.length);
        setAnimate(true);
      }, 100);
    }, 4000);

    return () => clearInterval(timer);
  }, [skills.length]);

  return (
    <Div size={'default'} className='skill-showcase overflow-hidden w-full'>
      <H2 size='h4' className={animate ? 'slideInFromLeft' : ''}>
        {skills[index].first}
      </H2>
      <H3
        size='h5'
        variant={'description'}
        className={cn(animate ? 'slideInFromRight' : '')}
      >
        {skills[index].second}
      </H3>
    </Div>
  );
}
