'use client';
import { H2, H3 } from '@ezstart/ui/components';
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
    <div className='skill-showcase mt-6 overflow-hidden'>
      <H2 size='h4' className={animate ? 'slideInFromLeft' : ''}>
        {skills[index].first}
      </H2>

      <H3 size='h5' className={animate ? 'slideInFromRight' : ''}>
        {skills[index].second}
      </H3>
    </div>
  );
}
