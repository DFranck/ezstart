'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H2,
  H3,
  Icon,
  KnownIconName,
  P,
  Section,
  Span,
  SplitSection,
  SplitSectionItem,
  Strong,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { Fragment, useEffect, useState } from 'react'

export default function HomePage(): any {
  const t = useTranslations('home')
  const [showSubtitle, setShowSubtitle] = useState(false)

  useEffect(() => {
    // Start animation after 500ms delay
    const timer = setTimeout(() => {
      setShowSubtitle(true)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {/* Hero Section - Mix of slide presentation + v2 */}
      <Section size={'full'} className={'t'}>
        <Div layout={'row'}>
          <Image
            src="/logo_complet_light.svg"
            alt="GreenPulse.AI Logo"
            width={300}
            height={60}
            className="animate-glow-pulse dark:hidden"
          />
          <Image
            src="/logo_complet_dark.svg"
            alt="GreenPulse.AI Logo"
            width={300}
            height={60}
            className="animate-glow-pulse hidden dark:block"
          />
        </Div>
        <H1 className="sr-only">{t('hero.title')}</H1>
        <Div layout={'center'} className="gap-6">
          {/* Subtitle: One Sustainable Agent for 1 Million Businesses - Animated */}
          <H2
            size={'h3'}
            className={`transition-all duration-1000 ${
              showSubtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            {t('hero.subtitle')
              .split(' ')
              .map((word, index) => (
                <span
                  key={`word-${index}-${word}`}
                  className="inline-block"
                  style={{
                    animation: showSubtitle
                      ? `fadeInWord 0.4s ease-out ${index * 0.15}s forwards`
                      : 'none',
                    opacity: showSubtitle ? 1 : 0,
                  }}
                >
                  {word}
                  {index < t('hero.subtitle').split(' ').length - 1 ? '\u00A0' : ''}
                </span>
              ))}
          </H2>
          <style jsx>{`
            @keyframes fadeInWord {
              from {
                opacity: 0;
                transform: translateY(10px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>

          {/* Feature tags */}
          <Div layout={'row'} className="hidden lg:flex flex-wrap justify-center gap-2">
            {(Array.isArray(t.raw('heroFeatures')) ? t.raw('heroFeatures') : []).map(
              (feature: string, index: number) => (
                <Badge
                  key={index}
                  className="rounded-full bg-gp-accent text-gp-accent-foreground px-4 py-1 text-sm font-medium"
                >
                  {feature}
                </Badge>
              )
            )}
          </Div>

          {/* Value Proposition */}
          <P className="text-base text-center text-foreground font-medium max-w-4xl">
            {t('hero.description')}
          </P>
        </Div>

        {/* CTA Buttons */}
        <Div layout={'grid'} className="gap-4">
          <Button
            asChild
            size="lg"
            className="bg-gp-primary hover:bg-gp-primary/80 text-lg px-8 py-6"
          >
            <Link href="/chat" target="_blank" rel="noopener noreferrer">
              {t('hero.getStarted')}
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-muted hover:bg-muted/80 border-foreground border text-foreground font-bold text-xl px-8 py-6"
          >
            <Link href="#partnership">
              {t('hero.ctaSecondary')} <Span className="ml-1">→</Span>
            </Link>
          </Button>
        </Div>
      </Section>
      {/* Challenge Context Section - Using SplitSection with diagonal */}
      <SplitSection
        diagonal={true}
        diagonalDirection="left"
        diagonalAngle={15}
        align="stretch"
        inverted
        className="lg:pb-20"
      >
        {/* Left side - Content */}
        <SplitSectionItem size="xl" className="xl:mx-20">
          <H3 size={'h4'} className="text-xl lg:text-2xl font-bold mb-6 leading-tight">
            {t.rich('challenge.title', {
              strong: chunks => <Strong className="text-warning">{chunks}</Strong>,
            })}
          </H3>
          {/* 
          <Div className="space-y-4">
            {(Array.isArray(t.raw('challenge.challenges'))
              ? t.raw('challenge.challenges')
              : []
            ).map((challenge: string, index: number) => (
              <Div key={index} className="flex items-start gap-3">
                <Div className="w-2 h-2 bg-gp-primary rounded-full mt-2 flex-shrink-0" />
                <P className="text-base lg:text-lg text-muted-foreground">{challenge}</P>
              </Div>
            ))}
          </Div> */}
        </SplitSectionItem>

        {/* Right side - 3 images */}
        <SplitSectionItem className="h-full">
          <Div className="grid grid-rows-1 h-full">
            {/* Image 1 - Climate */}
            <Div className="relative w-full h-full">
              <Image
                src="/images/climate.webp"
                alt="Climate change and extreme weather illustration"
                fill
                className="object-cover"
              />
            </Div>
          </Div>
        </SplitSectionItem>
      </SplitSection>
      <H2 size="h3" className="text-center my-12">
        {t('challenge.sealTitle')}
      </H2>
      {/* Light mode version */}
      <Image
        src={'/images/pierced_seal_light.svg'}
        width={500}
        height={500}
        alt="Southeast Asia Climate Seal"
        className="dark:hidden"
      />
      {/* Dark mode version */}
      <Image
        src={'/images/pierced_seal_dark.svg'}
        width={500}
        height={500}
        alt="Southeast Asia Climate Seal"
        className="hidden dark:block"
      />
      {/* Data Transformation Section */}
      <Section size="xl" id="how-it-works">
        <H2 size="h3">{t('transformation.title')}</H2>
        <Div size={'xl'} className="w-full">
          {/* 3-Step Process with AI in center */}
          {/* Desktop Light */}
          <Image
            src={'/images/GreenPulse_transformation_Desktop.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="hidden md:block dark:md:hidden w-full"
          />
          {/* Desktop Dark */}
          <Image
            src={'/images/GreenPulse_transformation_Desktop_dark.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="hidden dark:md:block w-full"
          />
          {/* Mobile Light */}
          <Image
            src={'/images/GreenPulse_transformation_Mobile.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="block md:hidden dark:hidden"
          />
          {/* Mobile Dark */}
          <Image
            src={'/images/GreenPulse_transformation_Mobile_dark.svg'}
            width={500}
            height={500}
            alt="GreenPulse Transformation Process"
            className="hidden dark:block dark:md:hidden"
          />
        </Div>
        {/* 3 Feature Cards */}
        <Div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {(Array.isArray(t.raw('transformation.features'))
            ? t.raw('transformation.features')
            : []
          ).map((feature: { title: string; description: string }, index: number) => (
            <Card key={index}>
              <CardHeader className="flex items-center gap-3">
                <Icon
                  name={
                    index === 0
                      ? 'lucide:Database'
                      : index === 1
                        ? 'lucide:TrendingUp'
                        : 'lucide:FileText'
                  }
                  size={30}
                />
                <H3 size="h6" className="w-fit">
                  {feature.title}
                </H3>
              </CardHeader>
              <CardContent>
                <P className="text-muted-foreground">{feature.description}</P>
              </CardContent>
            </Card>
          ))}
        </Div>
      </Section>
      {/* Problem Statement Section */}
      <Section size={'xl'}>
        <Div className="container mx-auto">
          <Div className="text-center mb-12">
            <H2 size="h3" className="mb-4">
              {t.rich('problem.title', {
                strong: chunks => <Strong>{chunks}</Strong>,
              })}
            </H2>
            <P className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t.rich('problem.subtitle', {
                strong: chunks => <Strong className="text-warning">{chunks}</Strong>,
              })}
            </P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {(Array.isArray(t.raw('problem.problems')) ? t.raw('problem.problems') : []).map(
              (item: { title: string; description: string }, index: number) => (
                <Card key={index}>
                  <CardHeader className="flex items-center gap-3">
                    <Icon
                      name={
                        (index === 0
                          ? 'lucide:Clock'
                          : index === 1
                            ? 'lucide:FileWarning'
                            : 'lucide:Users') as KnownIconName
                      }
                      size={30}
                      className="mr-3"
                    />
                    <H3 size="h6" className="w-fit">
                      {item.title}
                    </H3>
                  </CardHeader>
                  <CardContent>
                    <P className="text-muted-foreground text-sm">
                      {t.rich(`problem.problems.${index}.description`, {
                        strong: chunks => <Strong className="text-gp-primary">{chunks}</Strong>,
                      })}
                    </P>
                  </CardContent>
                </Card>
              )
            )}
          </Div>
        </Div>
      </Section>

      {/* Competitive Advantage Section */}
      <Section size={'xl'} id="competitive-advantage">
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-12">
            {t('competitive.title')}
          </H2>

          {/* Comparison Table */}
          <Div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  <th className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.feature')}
                  </th>
                  <th className="p-4 text-left border-b-2 border-gp-primary bg-gp-primary/10">
                    <Strong className="text-gp-primary">
                      {t('competitive.headers.greenpulse')}
                    </Strong>
                  </th>
                  <th className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.software')}
                  </th>
                  <th className="p-4 text-left border-b-2 border-border">
                    {t('competitive.headers.ai')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(t.raw('competitive.rows')) ? t.raw('competitive.rows') : []).map(
                  (
                    row: {
                      feature: string
                      greenpulse: string
                      software: string
                      ai: string
                    },
                    index: number
                  ) => (
                    <tr key={index} className="border-b border-border hover:bg-muted/50">
                      <td className="p-4 font-medium text-muted-foreground">{row.feature}</td>
                      <td className="p-4 bg-gp-primary/5 font-semibold text-gp-primary">
                        {row.greenpulse}
                      </td>
                      <td className="p-4">{row.software}</td>
                      <td className="p-4">{row.ai}</td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </Div>

          {/* CTA */}
          <Div className="text-center">
            <P className="text-lg mb-6">{t('competitive.ctaSubtitle')}</P>
            <Button asChild size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
              <Link href="/chat" target="_blank" rel="noopener noreferrer">
                {t('competitive.cta')}
              </Link>
            </Button>
          </Div>
        </Div>
      </Section>

      {/* Use Cases Section */}
      <Section size={'xl'} id="use-cases">
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-12">
            {t('useCases.title')}
          </H2>

          {/* Horizontal Cards - Stacked Vertically */}
          <Div className="flex flex-col gap-6 max-w-6xl mx-auto">
            {(
              t.raw('useCases.cases') as Array<{
                icon: string
                title: string
                challenge: string
                solution: string
                result: string
                badges: string[]
              }>
            ).map((useCase, index) => (
              <Card
                key={index}
                className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <Div className="flex flex-col md:flex-row gap-6 p-6">
                  {/* Left: Icon */}
                  <Div className="flex-shrink-0 text-center md:text-left">
                    <Div className="text-6xl md:text-7xl">{useCase.icon}</Div>
                  </Div>

                  {/* Center: Content */}
                  <Div className="flex-1 space-y-4">
                    <H3 size="h5" className="text-gp-primary">
                      {useCase.title}
                    </H3>
                    <Div>
                      <Strong className="text-sm">Challenge:</Strong>
                      <P className="text-sm text-muted-foreground mt-1">{useCase.challenge}</P>
                    </Div>
                    <Div>
                      <Strong className="text-sm">Solution:</Strong>
                      <P className="text-sm text-muted-foreground mt-1">{useCase.solution}</P>
                    </Div>
                    <Div>
                      <Strong className="text-sm">Result:</Strong>
                      <P className="text-sm text-muted-foreground mt-1">{useCase.result}</P>
                    </Div>
                  </Div>

                  {/* Right: Badges */}
                  <Div className="flex-shrink-0 flex flex-wrap md:flex-col gap-2 md:justify-end md:items-end">
                    {useCase.badges.map((badge, badgeIndex) => (
                      <Span
                        key={badgeIndex}
                        className="bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap"
                      >
                        {badge}
                      </Span>
                    ))}
                  </Div>
                </Div>
              </Card>
            ))}
          </Div>

          {/* Disclaimer */}
          <P className="text-center text-sm text-muted-foreground mt-8 italic max-w-4xl mx-auto">
            {t('useCases.disclaimer')}
          </P>
        </Div>
      </Section>

      {/* Credibility Section */}
      <Section size={'xl'}>
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-12">
            {t('credibility.title')}
          </H2>

          {/* Credibility Cards */}
          <Div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-8">
            {(
              t.raw('credibility.cards') as Array<{
                icon: string
                title: string
                description: string
              }>
            ).map((card, index) => (
              <Card
                key={index}
                className="border-t-4 border-t-gp-accent hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <Div className="flex items-center gap-3 mb-3">
                    <Div className="text-4xl flex-shrink-0">{card.icon}</Div>
                    <H3 size="h6" className="text-gp-primary">
                      {card.title}
                    </H3>
                  </Div>
                </CardHeader>
                <CardContent>
                  <P className="text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </P>
                </CardContent>
              </Card>
            ))}
          </Div>

          {/* Team Note */}
          <Div className="max-w-4xl mx-auto mt-12 p-6 bg-muted/30 border-l-4 border-gp-primary rounded-lg">
            <P className="text-sm leading-relaxed">
              <Strong>{t('credibility.teamNote')}</Strong>
            </P>
          </Div>
        </Div>
      </Section>
      {/* Partnership Section */}
      <Section size={'xl'} id="partnership" className="bg-muted/30">
        <Div className="container mx-auto">
          <H2 size="h3" className="text-center mb-4">
            {t('partnership.title')}
          </H2>
          <H3 size="h5" className="text-center mb-12 text-muted-foreground">
            {t('partnership.subtitle')}
          </H3>

          <Div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 max-w-6xl mx-auto mb-8">
            {(
              t.raw('partnership.values') as Array<{
                icon: string
                title: string
                items: string[]
              }>
            ).map((value, index) => (
              <Fragment key={index}>
                <Card className="bg-gp-accent/10 dark:bg-gp-accent/5 border-gp-accent dark:border-gp-accent border-2 transition-all duration-300 hover:scale-105 hover:shadow-lg w-full md:w-auto">
                  <CardHeader>
                    <Div className="flex items-center gap-3 mb-4">
                      <Div className="font-bold rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 text-xl bg-gp-primary text-primary-foreground">
                        {index + 1}
                      </Div>
                      <H3 size="h5" className="text-gp-primary">
                        {value.title}
                      </H3>
                    </Div>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                      {value.items.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                {/* Plus symbol between cards (not after last card) */}
                {index < 2 && (
                  <Div className="flex-shrink-0 text-4xl md:text-5xl font-bold text-gp-primary my-4 md:my-0">
                    +
                  </Div>
                )}
              </Fragment>
            ))}
          </Div>

          <Div className="text-center space-y-4">
            <Button asChild size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
              <a href={`mailto:aseradni@nexora-venture.com`}>{t('partnership.cta')}</a>
            </Button>
            <P className="text-sm text-muted-foreground italic">{t('partnership.note')}</P>
          </Div>
        </Div>

        <Div>
          <H3 size="h5" className="text-center mb-8 text-muted-foreground">
            {t('press.title')}
          </H3>
          <Div layout={'center'} className="max-w-3xl mx-auto">
            {[
              {
                publication: t('press.vietstock.publication'),
                title: t('press.vietstock.title'),
                quote: t('press.vietstock.quote'),
                // Vietnamese quote (hardcoded - always displayed)
                quoteVi:
                  'Gần đây, chúng tôi đang thử nghiệm một ứng dụng có tên GreenPulse.AI. Đây là một trợ lý ứng dụng trí tuệ nhân tạo (AI) giúp các doanh nghiệp SME tại Việt Nam và Đông Nam Á dễ dàng thực hành bền vững. Người dùng sẽ được hướng dẫn từng bước để giải quyết các vấn đề như giảm chi phí điện, đáp ứng yêu cầu xuất khẩu, đi kèm bảng điều khiển theo dõi tiến độ. Nền tảng còn tích hợp công cụ báo cáo ESG tự động theo tiêu chuẩn quốc tế. Mục đích chính là giúp các doanh nghiệp tránh bẫy "tẩy xanh", chứng minh các cải tiến có thể đo lường, và mở rộng cơ hội tiếp cận nhà đầu tư, khách hàng cùng thị trường quốc tế.',
                logo: '/images/vietstock.svg',
                url: 'https://vietstock.vn/2025/11/tay-xanh-duoi-goc-nhin-cua-chuyen-gia-tu-van-esg-quoc-te-761-1365211.htm',
                date: t('press.vietstock.date'),
              },
            ].map((item, index) => (
              <a
                key={index}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <Card className="p-6 border-l-4 border-gp-primary hover:shadow-lg transition-shadow">
                  <Div className="flex flex-col md:flex-row items-start gap-6">
                    {/* Left side - Logo + Cover Image */}
                    <Div className="flex-shrink-0 w-full md:w-48 space-y-4">
                      <Div className="w-32 h-12 relative">
                        <Image
                          src={item.logo}
                          alt={item.publication}
                          fill
                          className="object-contain"
                        />
                      </Div>
                      <Div className="w-full aspect-[16/9] relative rounded-md overflow-hidden border border-border">
                        <Image
                          src="/images/GLC-cover.jpg"
                          alt="GreenPulse.AI Article Cover"
                          fill
                          className="object-cover"
                        />
                      </Div>
                    </Div>
                    {/* Right side - Content */}
                    <Div className="flex-1 space-y-3">
                      <Div>
                        <P className="font-semibold mb-1">
                          {item.publication}{' '}
                          <Span className="text-xs text-muted-foreground">{item.date}</Span>
                        </P>
                        <P className="text-sm font-medium text-foreground">{item.title}</P>
                      </Div>
                      {/* Vietnamese quote (always shown) */}
                      <P className="text-muted-foreground italic text-sm border-l-2 border-muted pl-3">
                        {item.quoteVi}
                      </P>
                      {/* Translated quote (EN/FR based on locale) */}
                      <P className="text-muted-foreground italic text-sm">{item.quote}</P>
                    </Div>
                  </Div>
                </Card>
              </a>
            ))}
          </Div>
        </Div>
      </Section>
      {/* FAQ Section */}
      <Section size={'xl'} className="bg-muted/30">
        <Div className="container mx-auto max-w-4xl">
          <H2 size="h3" className="text-center mb-12">
            {t('faq.title')}
          </H2>

          <Accordion type="multiple" className="space-y-4">
            {(
              t.raw('faq.questions') as Array<{
                question: string
                answer: string
              }>
            ).map((item, index) => (
              <AccordionItem
                key={index}
                value={`faq-${index}`}
                className="bg-card border rounded-lg"
              >
                <AccordionTrigger className="px-6 py-4 hover:no-underline">
                  <Div className="flex items-start gap-3 text-left">
                    <Icon
                      name="lucide:HelpCircle"
                      className="w-5 h-5 flex-shrink-0 mt-1 text-gp-primary"
                    />
                    <Span className="font-medium">{item.question}</Span>
                  </Div>
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4">
                  <P className="text-muted-foreground leading-relaxed pl-8">{item.answer}</P>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Div>
      </Section>

      {/* Packages Section */}
      <Section size="full" id="pricing">
        <Div className="container mx-auto">
          <H3 className="text-4xl font-bold text-center ">{t('packages.title')}</H3>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Free Package - Self-Awareness */}
            <Card className="p-8 border-2 border-border hover:shadow-lg transition-all duration-300">
              <Div className="mb-6">
                <H3 className="text-2xl font-bold mb-2 text-foreground">
                  {t('packages.free.title')}
                </H3>
                <P className="text-sm text-muted-foreground">{t('packages.free.subtitle')}</P>
              </Div>

              {/* Description */}
              <P className="text-sm text-muted-foreground mb-6 leading-relaxed">
                {t('packages.free.description')}
              </P>

              {/* Features */}
              <Div className="space-y-3 mb-6">
                {Object.entries(t.raw('packages.free.features') as Record<string, string>).map(
                  ([key, feature]) => (
                    <Div key={key} className="flex items-start space-x-3">
                      <Icon
                        name="lucide:Check"
                        className="w-5 h-5 text-gp-primary flex-shrink-0 mt-0.5"
                      />
                      <P className={`text-sm ${key === 'instant' ? 'font-semibold' : ''}`}>
                        {feature}
                      </P>
                    </Div>
                  )
                )}
              </Div>

              {/* CTA */}
              <Button asChild className="w-full bg-gp-primary hover:bg-gp-primary/90 text-white">
                <Link href="/chat">{t('packages.free.cta')}</Link>
              </Button>
            </Card>

            {/* Premium Package */}
            <Card className="p-8 border-2 border-primary/30  relative">
              <Div className="text-center mb-6">
                <Icon name="lucide:TrendingUp" className="w-12 h-12  mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">
                  {t('packages.premium.title')}
                </H3>
                <P className="text-sm font-medium  uppercase tracking-wide">
                  {t('packages.premium.subtitle')}
                </P>
              </Div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.premium.description')}
              </P>

              <Div className="space-y-3 mb-6">
                {[
                  { icon: 'lucide:MessageCircle', text: t('packages.premium.features.chat') },
                  { icon: 'lucide:BarChart3', text: t('packages.premium.features.tools') },
                  { icon: 'lucide:Upload', text: t('packages.premium.features.import') },
                  { icon: 'lucide:PieChart', text: t('packages.premium.features.analysis') },
                  { icon: 'lucide:ClipboardList', text: t('packages.premium.features.plans') },
                ].map((item, index) => (
                  <Div key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 " />
                    <P className="text-sm">{item.text}</P>
                  </Div>
                ))}
              </Div>

              {/* CTA */}
              <Button asChild className="w-full" variant="outline">
                <a href="mailto:aseradni@nexora-venture.com?subject=Premium%20Package%20Inquiry">
                  {t('packages.contactUs')}
                </a>
              </Button>
            </Card>

            {/* Golden Package */}
            <Card className="p-8 border-2 border-amber-300 ">
              <Div className="text-center mb-6">
                <Icon name="lucide:Award" className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">
                  {t('packages.golden.title')}
                </H3>
                <P className="text-sm font-medium text-amber-600 uppercase tracking-wide">
                  {t('packages.golden.subtitle')}
                </P>
              </Div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.golden.description')}
              </P>

              <Div className="space-y-3 mb-6">
                {[
                  { icon: 'lucide:Star', text: t('packages.golden.features.all') },
                  {
                    icon: 'lucide:Handshake',
                    text: t('packages.golden.features.support'),
                  },
                  { icon: 'lucide:UserCheck', text: t('packages.golden.features.replace') },
                ].map((item, index) => (
                  <Div key={index} className="flex items-center space-x-3">
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 text-amber-500" />
                    <P className="text-sm">{item.text}</P>
                  </Div>
                ))}
              </Div>

              {/* CTA */}
              <Button asChild className="w-full" variant="outline">
                <a href="mailto:aseradni@nexora-venture.com?subject=Golden%20Package%20Inquiry">
                  {t('packages.contactUs')}
                </a>
              </Button>
            </Card>
          </Div>
        </Div>
      </Section>
      {/* Bottom CTA Section */}
      <Section size={'xl'} className="max-w-full t">
        <Div className="container mx-auto text-center">
          <Div className="max-w-3xl mx-auto">
            <H3 className="text-3xl lg:text-4xl font-bold mb-6">{t('cta.title')}</H3>
            <P className="text-xl mb-8">{t('cta.description')}</P>
            <Button
              asChild
              size="lg"
              className="bg-gp-primary hover:bg-gp-primary/80 text-lg px-8 py-6"
            >
              <Link href="/chat" target="_blank" rel="noopener noreferrer">
                {t('cta.getStarted')}
              </Link>
            </Button>
          </Div>
        </Div>
      </Section>
    </>
  )
}
