'use client'

import { Burger, Div } from '@ezstart/ui/components'
import { useClickOutside, useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MobileNavMenu } from './mobile-nav-menu'
export default function MobileNavbar() {
  const { isMobile } = useDevice()
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const burgerRef = useRef<HTMLButtonElement>(null)

  useClickOutside(mobileMenuRef, () => {
    if (burgerRef.current?.contains(event?.target as Node)) return
    if (isMobile && isOpen) {
      setIsOpen(false)
    }
  })

  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false)
    }
  }, [isMobile, isOpen])

  if (!isMobile) return null

  return (
    <Div className="fixed bottom-0 left-0 right-0 z-50 bg-background">
      <Div
        ref={mobileMenuRef}
        className={cn(
          'transition-all duration-500 border-t-2 ease-in-out overflow-hidden px-2',
          isOpen ? 'max-h-[400px] py-2 ' : 'max-h-0'
        )}
      >
        <MobileNavMenu variant={'secondary'} setIsOpen={setIsOpen} />
      </Div>

      <Div className=" shadow-md">
        <Div className="grid grid-cols-2 items-center w-full ">
          <Link href={`/${locale}`} className="w-full flex justify-center py-2">
            <Image
              src="/images/logo.png"
              alt="ASC Logo"
              width={32}
              height={32}
              className="mx-auto"
            />
          </Link>

          <Burger isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} ref={burgerRef} />
          {/* <Button
            variant={'ghost'}
            onClick={(e) => {
              alert('Not implemented yet');
              e.stopPropagation();
            }}
          >
            <Icon name='fa:FaUser' />
          </Button> */}
        </Div>
      </Div>
    </Div>
  )
}
