'use client'

import { Button, Div, Input, Label, Modal, Textarea } from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useLocale, useTranslations } from 'next-intl'
import { useState, type ComponentProps, type FormEvent } from 'react'
import { callApi } from '@/config/api'

export type ContactTopic =
  | 'discuss'
  | 'white-label'
  | 'integrations'
  | 'pro'
  | 'general'
  | 'careers'

interface ContactButtonProps {
  topic: ContactTopic
  children: React.ReactNode
  variant?: ComponentProps<typeof Button>['variant']
  size?: ComponentProps<typeof Button>['size']
  className?: string
}

export function ContactButton({ topic, children, variant, size, className }: ContactButtonProps) {
  const t = useTranslations('home.contact')
  const isCareers = topic === 'careers'
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [website, setWebsite] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSending) return
    setIsSending(true)
    try {
      await callApi('/contact', {
        method: 'POST',
        skipAuth: true,
        body: { topic, company, email, message, locale, website },
      })
      toast.success(t('success'))
      setCompany('')
      setEmail('')
      setMessage('')
      setIsOpen(false)
    } catch {
      toast.error(t('error'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        {children}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="default"
        title={t(`topics.${topic}`)}
        description={t('description')}
      >
        {/* eslint-disable-next-line @ezstart/ezstart/no-raw-html -- @ezstart/ui has no Form alias */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Div className="space-y-2">
            <Label htmlFor={`contact-company-${topic}`}>
              {isCareers ? t('name') : t('company')}
            </Label>
            <Input
              id={`contact-company-${topic}`}
              value={company}
              onChange={event => setCompany(event.target.value)}
              placeholder={isCareers ? t('namePlaceholder') : t('companyPlaceholder')}
              autoComplete={isCareers ? 'name' : 'organization'}
              maxLength={200}
              required
            />
          </Div>
          <Div className="space-y-2">
            <Label htmlFor={`contact-email-${topic}`}>{t('email')}</Label>
            <Input
              id={`contact-email-${topic}`}
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder={t('emailPlaceholder')}
              autoComplete="email"
              maxLength={254}
              required
            />
          </Div>
          <Div className="space-y-2">
            <Label htmlFor={`contact-message-${topic}`}>{t('message')}</Label>
            <Textarea
              id={`contact-message-${topic}`}
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder={t('messagePlaceholder')}
              rows={5}
              maxLength={3000}
              required
            />
          </Div>
          {/* Honeypot: hidden from people and assistive tech, bots fill it. */}
          <Div className="hidden" aria-hidden="true">
            <Input
              tabIndex={-1}
              autoComplete="off"
              name="website"
              value={website}
              onChange={event => setWebsite(event.target.value)}
            />
          </Div>
          <Div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSending}
              className="bg-gp-primary hover:bg-gp-primary/80"
            >
              {isSending ? t('sending') : t('submit')}
            </Button>
          </Div>
        </form>
      </Modal>
    </>
  )
}
