'use client'

import { Burger, Icon } from '@ezstart/ui/components'
import { useClickOutside, useDevice } from '@ezstart/ui/hooks'
import { cn } from '@ezstart/ui/lib'
import { useLocale } from 'next-intl'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { MobileNavMenu } from './mobile-nav-menu'

export default function MobileNavbar() {
  const { isMobile } = useDevice()
  const currentLocale = useLocale()
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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background">
      <div
        ref={mobileMenuRef}
        className={cn(
          'transition-all duration-500 border-t-2 ease-in-out overflow-hidden px-2',
          isOpen ? 'max-h-[400px] py-2 ' : 'max-h-0'
        )}
      >
        <MobileNavMenu variant={'secondary'} setIsOpen={setIsOpen} />
      </div>

      <div className=" shadow-md">
        <div className="grid grid-cols-2 items-center w-full ">
          <Link href={`/${currentLocale}`} className="w-full flex justify-center py-2">
            <Icon name="custom:Ezstart" size={24} />
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
        </div>
      </div>
    </div>
  )
}
