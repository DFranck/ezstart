'use client';

import { Tag } from '@ezstart/ui/components';
import { cn } from '@ezstart/ui/lib';

const Burger = ({
  setIsOpen,
  isOpen,
  className,
  ...props
}: {
  setIsOpen?: (isOpen: boolean) => void;
  isOpen: boolean;
  className?: string;
  [key: string]: any;
}) => {
  const handleClick = () => {
    if (setIsOpen) {
      setIsOpen(!isOpen);
    }
  };
  return (
    <Tag
      as='button'
      onClick={handleClick}
      size={'sm'}
      variant={'ghost'}
      className={cn(
        'relative cursor-pointer flex flex-col justify-center items-center ',
        className
      )}
      {...props}
    >
      <Tag
        as='span'
        className={cn(
          'block  h-0.5 w-5 bg-current transform transition duration-500 ease-in-out',
          isOpen ? 'rotate-45 translate-y-2' : 'rotate-0 '
        )}
      />
      <Tag
        as='span'
        className={cn(
          'block  h-0.5 w-5 bg-current transform transition duration-500 ease-in-out',
          isOpen ? 'opacity-0' : 'opacity-100'
        )}
      />
      <Tag
        as='span'
        className={cn(
          'block  h-0.5 w-5 bg-current transform transition duration-500 ease-in-out',
          isOpen ? '-rotate-45 -translate-y-2 ' : 'rotate-0 '
        )}
      />
    </Tag>
  );
};

export default Burger;
