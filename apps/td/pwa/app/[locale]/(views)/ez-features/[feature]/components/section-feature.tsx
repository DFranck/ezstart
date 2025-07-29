'use client';
import { FeatureItem } from '@/types/feature';
import { Button, H2, H4, Icon, Section } from '@ezstart/ui/components';
import Link from 'next/link';

type Props = {
  feature: FeatureItem;
  index?: number;
};

export const FeatureSection = ({ feature }: Props) => {
  return (
    <Section>
      <div className='flex items-center'>
        <H2>{feature.title}</H2>
      </div>
      <H4>{feature.description}</H4>
      <div className='flex gap-2'>
        <Button asChild>
          <Link href={feature.links.local}>
            <Icon name='fa:FaPlay' />
            {feature.title}
          </Link>
        </Button>
      </div>
    </Section>
  );
};
