'use client';

import { Icon } from '@ezstart/ui/components';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type Item = {
  description: string;
  title: string;
  subtitle?: string;
  src: string;
};
export const FlippingGallery = ({
  items,
  autoplay = false,
}: {
  items: Item[];
  autoplay?: boolean;
}) => {
  const [active, setActive] = useState(0);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + items.length) % items.length);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  const randomRotateY = () => {
    return Math.floor(Math.random() * 21) - 10;
  };
  return (
    <div className='mx-auto max-w-sm px-4 py-20 font-sans antialiased md:max-w-4xl md:px-8 lg:px-12'>
      <div className='relative grid grid-cols-1 md:gap-20 md:grid-cols-2'>
        <div>
          <div className='relative h-80 w-full'>
            <AnimatePresence>
              {items.map((item, index) => (
                <motion.div
                  key={item.src}
                  initial={{
                    opacity: 0,
                    scale: 0.9,
                    z: -100,
                    rotate: randomRotateY(),
                  }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.7,
                    scale: isActive(index) ? 1 : 0.95,
                    z: isActive(index) ? 0 : -100,
                    rotate: isActive(index) ? 0 : randomRotateY(),
                    zIndex: isActive(index) ? 40 : items.length + 2 - index,
                    y: isActive(index) ? [0, -80, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.9,
                    z: 100,
                    rotate: randomRotateY(),
                  }}
                  transition={{
                    duration: 0.4,
                    ease: 'easeInOut',
                  }}
                  className='absolute inset-0 origin-bottom'
                >
                  <img
                    src={item.src}
                    alt={item.title}
                    width={500}
                    height={500}
                    draggable={false}
                    className='h-full w-full rounded-3xl object-cover object-center'
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className='flex flex-col justify-between py-4'>
          <motion.div
            key={active}
            initial={{
              y: 20,
              opacity: 0,
            }}
            animate={{
              y: 0,
              opacity: 1,
            }}
            exit={{
              y: -20,
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
              ease: 'easeInOut',
            }}
          >
            <h3 className='text-2xl font-bold text-black dark:text-white'>
              {items[active].title}
            </h3>
            <p className='text-sm text-gray-500 dark:text-neutral-500'>
              {items[active].subtitle}
            </p>
            <motion.p className='mt-4 text-sm md:text-lg text-gray-500 dark:text-neutral-300'>
              {items[active].description.split(' ').map((word, index) => (
                <motion.span
                  key={index}
                  initial={{
                    filter: 'blur(10px)',
                    opacity: 0,
                    y: 5,
                  }}
                  animate={{
                    filter: 'blur(0px)',
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.2,
                    ease: 'easeInOut',
                    delay: 0.02 * index,
                  }}
                  className='inline-block'
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>
          <div className='flex gap-4 pt-4 md:pt-0'>
            <button
              onClick={handlePrev}
              className='group/button flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800'
            >
              <Icon
                name='fa:FaArrowLeft'
                className='h-5 w-5 text-black transition-transform duration-300 group-hover/button:rotate-12 dark:text-neutral-400'
              />
            </button>
            <button
              onClick={handleNext}
              className='group/button flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-neutral-800'
            >
              <Icon
                name='fa:FaArrowRight'
                className='h-5 w-5 text-black transition-transform duration-300 group-hover/button:-rotate-12 dark:text-neutral-400'
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
