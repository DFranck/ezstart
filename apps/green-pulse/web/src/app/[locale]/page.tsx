'use client'

import {
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
  TypewriterEffectSmooth,
} from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'

export default function HomePage(): any {
  const t = useTranslations('home')

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
          {/* Subtitle: Your New Green Agent (from slide) */}
          <H2 size={'h3'}>{t('subtitle')}</H2>

          {/* Feature tags (from slide) */}
          <Div layout={'row'} className="hidden lg:flex ">
            {(Array.isArray(t.raw('heroFeatures')) ? t.raw('heroFeatures') : []).map(
              (feature: string, index: number) => (
                <Button key={index} className="rounded-full">
                  {feature}
                </Button>
              )
            )}
          </Div>

          {/* Typewriter effect (from v2) */}
          <TypewriterEffectSmooth
            words={[
              {
                text: t('hero.typewriterText'),
              },
            ]}
            className="text-gp-primary text-center"
            duration={3}
            delay={0.5}
          />
        </Div>
        {/* CTA Button */}
        <Button
          asChild
          size="lg"
          className="bg-gp-primary hover:bg-gp-primary/80 text-lg px-8 py-6"
        >
          <Link href="/chat" target="_blank" rel="noopener noreferrer">
            {t('hero.getStarted')}
          </Link>
        </Button>
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
      <Image src={'/images/pierced_seal.svg'} width={500} height={500} alt="" />
      {/* Data Transformation Section */}
      <Section size="xl">
        <H2 size="h3">{t('transformation.title')}</H2>
        <Div>
          {/* 3-Step Process with AI in center */}
          <Div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto ">
            {/* Step 1: Discuss & Upload */}
            <Card variant="ghost" className="relative space-y-4">
              <CardHeader className="flex items-center">
                <Badge circle circleSize={'lg'} className="bg-gp-primary">
                  {t('transformation.steps.step1.badge')}
                </Badge>
                <H3 size="h5" className="ml-2 w-fit">
                  {t('transformation.steps.step1.title')}
                </H3>
              </CardHeader>
              <CardContent>
                <Div className="flex justify-around items-center gap-4 bg-muted p-8 rounded-lg">
                  <Icon name="lucide:FileText" size={30} />
                  <Icon name="lucide:Mic" size={30} />
                  <Icon name="lucide:Camera" size={30} />
                  <Icon name="lucide:Paperclip" size={30} />
                  <Icon name="lucide:MessageCircle" size={30} />
                </Div>
              </CardContent>
            </Card>
            {/* Step 2: Let GPA Works (AI Center) */}
            <Card variant="ghost" className="relative space-y-4">
              <CardHeader className="flex items-center">
                <Badge circle circleSize={'lg'} className="bg-gp-primary">
                  {t('transformation.steps.step2.badge')}
                </Badge>
                <H3 size="h5" className="ml-2 w-fit">
                  {t('transformation.steps.step2.title')}
                </H3>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                <Div className="bg-gp-primary border-4 border-primary rounded-2xl p-8 w-fit">
                  <Icon name="lucide:Brain" size={30} />
                </Div>
              </CardContent>
            </Card>
            {/* Step 3: Get Results */}
            <Card variant="ghost" className="relative space-y-4">
              <CardHeader className="flex items-center ">
                <Badge circle circleSize={'lg'} className="bg-gp-primary">
                  {t('transformation.steps.step3.badge')}
                </Badge>
                <H3 size="h5" className="ml-2 w-fit">
                  {t('transformation.steps.step3.title')}
                </H3>
              </CardHeader>
              <CardContent>
                <Div className="flex justify-around items-center gap-4 bg-muted p-8 rounded-lg">
                  <Icon name="lucide:FileCheck" size={30} />
                  <Icon name="lucide:BarChart3" size={30} />
                  <Icon name="lucide:Network" size={30} />
                </Div>
              </CardContent>
            </Card>
          </Div>
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
      {/* Team Credibility Section */}
      <Section size={'xl'} layout={'grid'}>
        <Div className="px-6 py-12 md:px-12">
          <H2 size="h3" className="mb-6">
            {t('team.title')}
          </H2>
          <P className="text-lg text-muted-foreground mb-6 leading-relaxed">
            {t('team.description')}
          </P>
          <Div className="space-y-4">
            {(Array.isArray(t.raw('team.credentials')) ? t.raw('team.credentials') : []).map(
              (text: string, index: number) => (
                <Div key={index} className="flex items-start gap-3">
                  <Icon
                    name={
                      (index === 0
                        ? 'lucide:Award'
                        : index === 1
                          ? 'lucide:GraduationCap'
                          : 'lucide:Building2') as KnownIconName
                    }
                    className="w-6 h-6  mt-1 flex-shrink-0"
                  />
                  <P className="text-base">{text}</P>
                </Div>
              )
            )}
          </Div>
        </Div>
        <Div className="relative w-full h-full min-h-[400px]">
          <Image
            src="/images/team-experts.webp"
            alt="GreenPulse team of ESG experts and sustainability professionals"
            fill
            className="object-cover rounded-r-xl"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </Div>
      </Section>
      {/* Social Proof Section */}
      <Section size={'xl'}>
        <H2 size="h4" className="text-center mb-4">
          {t('partnership.title')}
        </H2>

        <Div>
          <H3 size="h5" className="mb-6 text-center">
            {t('partnership.subtitle')}
          </H3>

          <P className="text-muted-foreground mb-6 leading-relaxed">
            {t('partnership.description')}
          </P>

          <Div className="bg-muted/30 rounded-lg p-6 mb-6">
            <H3 size="h6" className="mb-4">
              {t('partnership.exchange.title')}
            </H3>
            <Div className="space-y-3">
              {(Array.isArray(t.raw('partnership.exchange.items'))
                ? t.raw('partnership.exchange.items')
                : []
              ).map((_item: string, index: number) => (
                <Div key={index} className="flex items-start gap-3">
                  <Icon
                    name="lucide:CheckCircle2"
                    className="w-5 h-5 text-gp-primary flex-shrink-0 mt-0.5"
                  />
                  <P className="text-sm">
                    {t.rich(`partnership.exchange.items.${index}`, {
                      strong: chunks => <Strong className="text-gp-primary">{chunks}</Strong>,
                    })}
                  </P>
                </Div>
              ))}
            </Div>
          </Div>

          <Div className="mb-6">
            <H3 size="h6" className="mb-4">
              {t('partnership.focus.title')}
            </H3>
            <Div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(Array.isArray(t.raw('partnership.focus.partners'))
                ? t.raw('partnership.focus.partners')
                : []
              ).map((text: string, index: number) => (
                <Card key={index} className="p-4 bg-background">
                  <Div className="flex items-start gap-3">
                    <Icon
                      name={
                        (index === 0
                          ? 'lucide:Database'
                          : index === 1
                            ? 'lucide:Leaf'
                            : 'lucide:FileText') as KnownIconName
                      }
                      className="w-5 h-5 text-gp-primary flex-shrink-0 mt-0.5"
                    />
                    <P className="text-sm">{text}</P>
                  </Div>
                </Card>
              ))}
            </Div>
          </Div>

          <Div className="text-center">
            <Button asChild size="lg" className="bg-gp-primary hover:bg-gp-primary/80">
              <a href="mailto:partnerships@greenpulse.ai">{t('partnership.cta')}</a>
            </Button>
          </Div>
        </Div>
        {/* <Div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto mb-16">
            {[1, 2, 3, 4].map(i => (
              <Div
                key={i}
                className="h-20 bg-muted rounded-lg flex items-center justify-center border border-border"
              >
                <P className="text-muted-foreground text-sm">Partner Logo {i}</P>
              </Div>
            ))}
          </Div> */}
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

          <Div className="space-y-4">
            {(
              t.raw('faq.questions') as Array<{
                question: string
                answer: string
              }>
            ).map((item, index) => (
              <Card key={index} className="p-6 bg-card">
                <Div>
                  <H3 size="h5" className="mb-3 flex items-start gap-3">
                    <Icon name="lucide:HelpCircle" className="w-6 h-6  flex-shrink-0 mt-1" />
                    <Span>{item.question}</Span>
                  </H3>
                  <P className="text-muted-foreground leading-relaxed pl-9">{item.answer}</P>
                </Div>
              </Card>
            ))}
          </Div>
        </Div>
      </Section>
      {/* Example Interaction Section */}
      <Section size={'xl'} className="max-w-full t">
        <H3>{t('example.title')}</H3>
        <Card variant={'ghost'} className="p-0 space-y-6">
          <Div className="shadow-sm bg-muted/50 p-6 rounded-xl border-l-4 border-primary">
            <Div className="flex items-start space-x-3 ">
              <Icon name="lucide:User" className="w-6 h-6  mt-1" />
              <Div>
                <P className="font-semibold  mb-2">{t('example.user')}</P>
                <P className="">{t('example.userMessage')}</P>
              </Div>
            </Div>
          </Div>

          <Div className="bg-muted p-6 rounded-xl border-l-4 border-accent-foreground">
            <Div className="flex items-start space-x-3">
              <Icon name="lucide:Bot" className="w-6 h-6 text-accent-foreground mt-1" />
              <Div>
                <P className="font-semibold text-accent-foreground mb-2">{t('example.ai')}</P>
                <P className="">{t('example.aiMessage')}</P>
              </Div>
            </Div>
          </Div>
        </Card>
      </Section>
      {/* Packages Section */}
      <Section size="full">
        <Div className="container mx-auto">
          <H3 className="text-4xl font-bold text-center ">{t('packages.title')}</H3>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* Free Package */}
            <Card className="p-8 border-2 hover:border-primary transition-colors duration-200">
              <Div className="text-center mb-6">
                <Icon
                  name="lucide:MessageCircle"
                  className="w-12 h-12 text-muted-foreground mx-auto mb-4"
                />
                <H3 className="text-2xl font-bold mb-2">{t('packages.free.title')}</H3>
                <P className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  {t('packages.free.subtitle')}
                </P>
              </Div>

              <P className="text-muted-foreground mb-6 text-sm leading-relaxed">
                {t('packages.free.description')}
              </P>

              <Div className="space-y-3">
                <Div className="flex items-center space-x-3">
                  <Icon name="lucide:MessageCircle" className="w-5 h-5 " />
                  <P className="">{t('packages.free.features.chat')}</P>
                </Div>
              </Div>
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

              <Div className="space-y-3">
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

              <Div className="space-y-3">
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
