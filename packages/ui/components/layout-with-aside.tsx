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
  showTopHeader = false,
  showMainHeader = false,
  topHeaderLeftContent,
  topHeaderCenterContent,
  topHeaderRightContent,
  mainHeaderLeftContent,
  mainHeaderCenterContent,
  mainHeaderRightContent,
  withHeaderOffset = false,
  disableTopHeaderBurger = false,
  disableMainHeaderBurger = false,
}: {
  withHeaderOffset?: boolean;
  children: React.ReactNode;
  asideContent: React.ReactNode;
  showTopHeader?: boolean;
  showMainHeader?: boolean;
  topHeaderLeftContent?: React.ReactNode;
  topHeaderCenterContent?: React.ReactNode;
  topHeaderRightContent?: React.ReactNode;
  mainHeaderLeftContent?: React.ReactNode;
  mainHeaderCenterContent?: React.ReactNode;
  mainHeaderRightContent?: React.ReactNode;
  disableTopHeaderBurger?: boolean;
  disableMainHeaderBurger?: boolean;
}) => {
  const { isMobile } = useDevice();
  const [isAsideOpen, setIsAsideOpen] = useState(false);
  const toggleAside = () => setIsAsideOpen((prev) => !prev);

  const debug = false;

  return (
    <Div
      withHeaderOffset={withHeaderOffset}
      size={'full'}
      layout={'col'}
      className={cn('gap-0 md:gap-0 lg:gap-0', debug && 'bg-red-500')}
    >
      {showTopHeader && (
        <Header
          className={cn('h-16', debug && 'bg-blue-500')}
          leftContent={
            debug ? (
              'left'
            ) : (
              <>
                {!disableTopHeaderBurger && isMobile && (
                  <Burger isOpen={isAsideOpen} setIsOpen={toggleAside} />
                )}
                {topHeaderLeftContent}
              </>
            )
          }
          centerContent={debug ? 'center' : topHeaderCenterContent}
          rightContent={debug ? 'right' : topHeaderRightContent}
        />
      )}
      <Div size={'full'} layout={'aside'}>
        <Aside
          className={cn(
            'transition-transform duration-300 ease-in-out flex-shrink-0 overflow-hidden',
            isMobile &&
              (isAsideOpen
                ? 'translate-x-0'
                : '-translate-x-full w-0 px-0 py-0'),
            debug && 'bg-pink-500'
          )}
        >
          {debug ? 'aside' : asideContent}
        </Aside>
        <Main className={cn('relative', debug && 'bg-yellow-500')}>
          {showMainHeader && (
            <Header
              className={cn('h-16', debug && 'bg-green-500')}
              leftContent={
                debug ? (
                  'left'
                ) : (
                  <>
                    {!disableMainHeaderBurger && isMobile && (
                      <Burger isOpen={isAsideOpen} setIsOpen={toggleAside} />
                    )}
                    {mainHeaderLeftContent}
                  </>
                )
              }
              centerContent={debug ? 'center' : mainHeaderCenterContent}
              rightContent={debug ? 'right' : mainHeaderRightContent}
              position='absolute'
            />
          )}
          {debug ? 'main' : children}
        </Main>
      </Div>
    </Div>
  );
};
