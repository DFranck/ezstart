'use client'

import { Icon, Tag } from '../'
import { useDevice } from '../../hooks'
import { cn } from '../../lib'
import type { KnownIconName } from '../icon/src/types'

export interface SocialLink {
  href: string
  icon: KnownIconName
  label: string
}

export interface FooterLink {
  href: string
  label: string
}

interface FooterProps {
  appName: string
  socialLinks?: SocialLink[]
  footerLinks?: FooterLink[]
  LinkComponent?: React.ComponentType<any> | string
  className?: string
  showCopyright?: boolean
}

export function Footer({
  appName,
  socialLinks = [],
  footerLinks = [],
  LinkComponent = 'a',
  className,
  showCopyright = true,
}: FooterProps) {
  const { isMobile } = useDevice()

  return (
    <Tag
      as="footer"
      data-component="footer"
      layout="centered"
      className={cn(isMobile && 'px-4', className)}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Left side - Copyright and links */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-start md:items-center">
          {showCopyright && (
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {appName}. All rights reserved.
            </span>
          )}
          {footerLinks.length > 0 && (
            <div className="flex gap-4">
              {footerLinks.map(link => (
                <LinkComponent
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {link.label}
                </LinkComponent>
              ))}
            </div>
          )}
        </div>

        {/* Right side - Social links */}
        {socialLinks.length > 0 && (
          <div className="flex gap-3">
            {socialLinks.map(social => (
              <LinkComponent
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-muted-foreground hover:text-primary transition-colors"
                aria-label={social.label}
              >
                <Icon name={social.icon} className="h-4 w-4" />
              </LinkComponent>
            ))}
          </div>
        )}
      </div>
    </Tag>
  )
}
