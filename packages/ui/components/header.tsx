import { cn } from '../lib/utils';
import { Div, Tag } from './tag';
import { headerVariantConfig } from './tag/src/variants/tags/header';

type Props = {
  leftContent?: React.ReactNode;
  centerContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  children?: React.ReactNode;
  position?: keyof typeof headerVariantConfig.position;
  layout?: keyof typeof headerVariantConfig.layout;
  className?: string;
};

export const Header = ({
  leftContent,
  centerContent,
  rightContent,
  children,
  layout = 'default',
  position = 'static',
  className,
}: Props) => {
  return (
    <Tag
      as='header'
      layout={layout}
      position={position}
      className={cn('px-2 md:px-6', className)}
    >
      {/* Main header bar */}
      <Div layout={'row'} size={'none'} className='w-full'>
        <Div layout={'row'} size={'none'}>
          {leftContent}
        </Div>
        <Div layout={'row'} size={'none'}>
          {centerContent}
        </Div>
        <Div layout={'row'} size={'none'}>
          {rightContent}
        </Div>
      </Div>

      {/* Optional additional content */}
      {children && (
        <Div size={'none'} layout={'row'}>
          {children}
        </Div>
      )}
    </Tag>
  );
};
