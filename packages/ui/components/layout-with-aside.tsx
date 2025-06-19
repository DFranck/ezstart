'use client';
import { useState } from 'react';
import { cn } from '.././lib/utils';
import { useDevice } from '../hooks';
import { Burger } from './burger';
import { Header } from './header';
import { Aside, Div, Main } from './tag';

export const LayoutWithAside = ({
  children,
  asideContent,
  topHeaderLeftContent,
  topHeaderCenterContent,
  topHeaderRightContent,
  mainHeaderLeftContent,
  mainHeaderCenterContent,
  mainHeaderRightContent,
  withHeaderOffset = false,
  disableTopHeaderBurger = false,
  disableMainHeaderBurger = false,
  asideAbsoluteOnMobile = false,
}: {
  withHeaderOffset?: boolean;
  children: React.ReactNode;
  asideContent: React.ReactNode;
  topHeaderLeftContent?: React.ReactNode;
  topHeaderCenterContent?: React.ReactNode;
  topHeaderRightContent?: React.ReactNode;
  mainHeaderLeftContent?: React.ReactNode;
  mainHeaderCenterContent?: React.ReactNode;
  mainHeaderRightContent?: React.ReactNode;
  disableTopHeaderBurger?: boolean;
  disableMainHeaderBurger?: boolean;
  asideAbsoluteOnMobile?: boolean;
}) => {
  const { isMobile } = useDevice();
  const [isAsideOpen, setIsAsideOpen] = useState(false);
  const toggleAside = () => setIsAsideOpen((prev) => !prev);
  const isTopHeaderVisible =
    topHeaderLeftContent || topHeaderCenterContent || topHeaderRightContent;
  const isMainHeaderVisible =
    mainHeaderLeftContent || mainHeaderCenterContent || mainHeaderRightContent;
  const debug = false;

  return (
    <Div
      size={'full'}
      layout={'default'}
      className={cn('min-h-screen h-full', debug && 'bg-red-500/30')}
    >
      {isTopHeaderVisible && (
        <Header
          className={cn('h-14 bg-muted border-y', debug && 'bg-blue-500/30')}
          leftContent={
            <>
              {!disableTopHeaderBurger && isMobile && (
                <Burger isOpen={isAsideOpen} setIsOpen={toggleAside} />
              )}
              {topHeaderLeftContent}
            </>
          }
          centerContent={topHeaderCenterContent}
          rightContent={topHeaderRightContent}
        />
      )}
      <Div size={'full'} layout={'aside'} className='relative h-full'>
        <Aside
          size={'xs'}
          layout={'col'}
          className={cn(
            'w-fit bg-muted border-r flex-1  ',
            'transition-transform duration-300 ease-in-out ',
            isMobile &&
              (isAsideOpen
                ? 'translate-x-0 '
                : '-translate-x-full w-0 px-0 py-0'),
            isMobile && asideAbsoluteOnMobile && 'absolute left-0 z-40',
            debug && 'bg-pink-500/30'
          )}
        >
          {asideContent}
        </Aside>
        <Main className={cn('relative ', debug && 'bg-yellow-500/30')}>
          {isMainHeaderVisible && (
            <Header
              className={cn('h-14 px-0', debug && 'bg-green-500/30')}
              leftContent={
                <>
                  {!disableMainHeaderBurger && isMobile && (
                    <Burger isOpen={isAsideOpen} setIsOpen={toggleAside} />
                  )}
                  {mainHeaderLeftContent}
                </>
              }
              centerContent={mainHeaderCenterContent}
              rightContent={mainHeaderRightContent}
              position='absolute'
            />
          )}
          {children}
        </Main>
      </Div>
    </Div>
  );
};
