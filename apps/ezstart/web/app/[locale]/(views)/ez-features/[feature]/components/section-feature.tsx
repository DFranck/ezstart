'use client';
import { getMeta } from '@/utils/get-meta';
import { Button, H2, H4, H6, Icon, Section } from '@ezstart/ui/components';
import Link from 'next/link';
import { FeatureId } from '../types';
interface FeatureSectionProps {
  featureId: FeatureId;
}
export const FeatureSection = ({ featureId }: FeatureSectionProps) => {
  const { name, description, github, status } = getMeta('feature', featureId);

  return (
    <Section>
      <div className='flex items-center'>
        <H2>{name}</H2>
        {status === 'in progress' && (
          <Section
            intent={'warning'}
            size={'xs'}
            className='flex-row items-center py-2 w-fit m-0 ml-4 '
          >
            <H6>{status}</H6>
            <Icon name='lucide:LucideLoaderCircle' spin />
          </Section>
        )}
      </div>
      <H4>{description}</H4>
      <div className='flex gap-2'>
        <Button asChild>
          <Link href={'/ez-features/' + name.toLowerCase()}>
            <Icon name='fa:FaPlay' />
            Go to {name}
          </Link>
        </Button>
      </div>
    </Section>
  );
};
