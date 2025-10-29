'use client'

import { getApiUrl } from '@ezstart/config/urls'
import { Button, Div, H1, H2, P, Section } from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useState } from 'react'

export function HeroSection() {
  const [email, setEmail] = useState('')
  const t = useTranslations('homeV2.hero')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    await runWithFeedback({
      action: async () => {
        const apiUrl = getApiUrl('ezauth')
        const response = await fetch(`${apiUrl}/api/auth/waitlist/green-pulse/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        })

        const data = await response.json()

        if (!response.ok) {
          if (response.status === 409 && data.code === 'EMAIL_EXISTS') {
            throw new Error(t('alreadyRegistered'))
          } else {
            throw new Error(data.error || t('error'))
          }
        }

        setEmail('')
        return data
      },
      toastLoading: { message: t('loading') },
      toastSuccess: { message: t('thankYou') },
      toastError: false,
      onError: error => {
        const errorMessage = error instanceof Error ? error.message : t('error')
        toast.error(errorMessage)
      },
    })
  }

  return (
    <Section className="max-w-none mx-auto bg-white">
      <Div className="w-full max-w-[1200px] mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-12 px-4 py-12 lg:py-20">
        {/* Text Content */}
        <Div className="flex-1 w-full lg:w-1/2">
          <H1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#080829] mb-4 leading-tight">
            {t('title')}
            <br />
            <span className="text-[#3f53d8]">{t('subtitle')}</span>
          </H1>
          <P className="text-base md:text-lg text-[#545479] mb-12 leading-relaxed">
            {t('description')}
          </P>
          <Div className="flex flex-col items-start gap-4">
            <Div className="flex items-center gap-4">
              <Button
                variant="default"
                size="lg"
                className="bg-[#3f53d8] hover:bg-[#3f53d8]/90 text-white px-8 py-6 rounded-lg font-semibold transition-all hover:scale-105 shadow-lg"
                asChild
              >
                <a href="#" data-tracker="HeroImageCTA|Signup">
                  {t('cta')}
                </a>
              </Button>
              <Image
                src="/logo.png"
                alt={t('noCreditCard')}
                width={130}
                height={40}
                className="w-auto h-10"
              />
            </Div>
            <P className="text-sm text-[#6f6f6f]">*{t('noCreditCardNote')}</P>
          </Div>
        </Div>

        {/* Video Content */}
        <Div className="flex-1 w-full lg:w-1/2">
          <Div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl">
            <video
              id="hero-video"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{
                backgroundImage:
                  'url("https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c%2F668fcc76e13673c8db0d0009_HomePageAnimation-poster-00001.jpg")',
              }}
            >
              <source src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c%2F668fcc76e13673c8db0d0009_HomePageAnimation-transcode.mp4" />
              <source src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c%2F668fcc76e13673c8db0d0009_HomePageAnimation-transcode.webm" />
            </video>
          </Div>
        </Div>
      </Div>

      {/* Logo Section */}
      <Section className="bg-[#f4f4f4] py-12 lg:py-16">
        <Div className="w-full max-w-[1200px] mx-auto px-4">
          <Div className="text-center mb-12">
            <H2 className="text-xl md:text-2xl font-medium text-[#545479]">{t('trustedBy')}</H2>
          </Div>
          <Div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center justify-items-center">
            <Div className="flex items-center justify-center">
              <Image
                src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f8371703ce1c8757aa379d_microsoft.svg"
                alt="Microsoft"
                width={130}
                height={100}
                className="w-auto h-12 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </Div>
            <Div className="flex items-center justify-center">
              <Image
                src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f8371647f20373113d2bad_google.svg"
                alt="Google"
                width={130}
                height={100}
                className="w-auto h-12 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </Div>
            <Div className="flex items-center justify-center">
              <Image
                src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83717a3f012164fa23bf7_adobe.svg"
                alt="Adobe"
                width={130}
                height={100}
                className="w-auto h-12 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </Div>
            <Div className="flex items-center justify-center">
              <Image
                src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83716bd50f8d47aec7a05_facebook.svg"
                alt="Facebook"
                width={130}
                height={100}
                className="w-auto h-12 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </Div>
            <Div className="flex items-center justify-center">
              <Image
                src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83716e09698fe456f19c7_amazon.svg"
                alt="Amazon"
                width={130}
                height={100}
                className="w-auto h-12 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </Div>
            <Div className="flex items-center justify-center">
              <Image
                src="https://cdn.prod.website-files.com/63ca9a05fdc83042565f605c/63f83716df0fd2b006a9cf0c_notion.svg"
                alt="Notion"
                width={130}
                height={100}
                className="w-auto h-12 opacity-60 hover:opacity-100 transition-opacity grayscale hover:grayscale-0"
              />
            </Div>
          </Div>
        </Div>
      </Section>
    </Section>
  )
}
