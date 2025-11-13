'use client'

import { getApiUrl } from '@ezstart/config/urls'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  H1,
  H2,
  H3,
  Icon,
  Input,
  KnownIconName,
  P,
  Section,
  SplitSection,
  SplitSectionItem,
  TypewriterEffectSmooth,
} from '@ezstart/ui/components'
import { runWithFeedback, toast } from '@ezstart/ui/utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const emailSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type EmailFormData = z.infer<typeof emailSchema>

export default function HomePage(): any {
  const t = useTranslations('home')

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: EmailFormData) => {
    await runWithFeedback({
      action: async () => {
        const apiUrl = getApiUrl('ezauth')
        const response = await fetch(`${apiUrl}/api/auth/waitlist/green-pulse/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: data.email }),
        })

        const responseData = await response.json()

        if (!response.ok) {
          // Status 409 = email already exists, use specific message
          if (response.status === 409 && responseData.code === 'EMAIL_EXISTS') {
            throw new Error(t('cta.alreadyRegistered') || 'Email already registered!')
          } else {
            throw new Error(
              responseData.error || t('cta.error') || 'Something went wrong. Please try again.'
            )
          }
        }

        form.reset()
        return responseData
      },
      toastLoading: { message: t('cta.loading') || 'Adding to waitlist...' },
      toastSuccess: {
        message: t('cta.thankYou') || "Thank you! You've been added to the waitlist.",
      },
      toastError: false,
      onError: error => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : t('cta.error') || 'Something went wrong. Please try again.'
        toast.error(errorMessage)
      },
    })
  }

  return (
    <>
      {/* Hero Section - Mix of slide presentation + v2 */}
      <Section size={'full'} className={'bg-gp-gradient'}>
        <Div layout={'row'}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={60}
            height={60}
            className="animate-pulse"
            style={{
              filter:
                'drop-shadow(0 0 8px rgb(16 185 129 / 0.8)) drop-shadow(0 0 16px rgb(16 185 129 / 0.6))',
            }}
          />

          <H1>
            {t('hero.title')}
            <span className="font-gugi font-medium">.AI</span>
          </H1>
        </Div>
        <Div layout={'center'} className="gap-6">
          {/* Subtitle: Your New Green Agent (from slide) */}
          <H2 size={'h3'}>Your New Green Agent</H2>

          {/* Feature tags (from slide) */}
          <Div layout={'row'} className="hidden lg:flex ">
            {[
              'Smart Data Extraction',
              'ESG Assistant',
              'AI-Driven',
              'Automated Reporting',
              'Tailored Strategy',
            ].map((feature, index) => (
              <Button key={index} className="rounded-full">
                {feature}
              </Button>
            ))}
          </Div>

          {/* Typewriter effect (from v2) */}
          <TypewriterEffectSmooth
            words={[
              {
                text: t('hero.typewriterText'),
              },
            ]}
            cursorClassName="bg-gp-primary text-center"
            duration={3}
            delay={0.5}
          />
        </Div>
        {/* CTA Form (from v2) */}
        <Div className="bg-background/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 lg:p-10 shadow-xl max-w-2xl mx-auto">
          <P className="text-base sm:text-lg font-medium mb-4">{t('hero.cta')}</P>
          <Form {...form}>
            <Div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input type="email" placeholder={t('hero.emailPlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" onClick={form.handleSubmit(onSubmit)}>
                {t('hero.notifyMe')}
              </Button>
            </Div>
          </Form>
        </Div>
      </Section>

      {/* Challenge Context Section - Using SplitSection with diagonal */}
      <SplitSection
        diagonal={true}
        diagonalDirection="left"
        diagonalAngle={15}
        align="stretch"
        inverted
      >
        {/* Left side - Content */}
        <SplitSectionItem size="xl" className="xl:mx-20">
          <H2 size={'h3'} className="text-2xl lg:text-3xl font-bold text-foreground">
            Challenge context :
          </H2>

          <H3 size={'h4'} className="text-xl lg:text-2xl font-bold mb-6 leading-tight">
            The world is facing extreme weather due to climate change : Companies are pushed to move
            beyond Business as Usual and to aim to sustainable growth:
          </H3>

          <Div className="space-y-4">
            {[
              'Limited resources to establish robust ESG frameworks and demonstrate real climate impact',
              'Lack of structured documentation to meet investor ESG requirements for fundraising',
              'Gaps in expertise to navigate international standards (GRI, SFDR, CSRD) required by impact investors',
            ].map((challenge, index) => (
              <Div key={index} className="flex items-start gap-3">
                <Div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0" />
                <P className="text-base lg:text-lg text-muted-foreground">{challenge}</P>
              </Div>
            ))}
          </Div>
        </SplitSectionItem>

        {/* Right side - 3 images */}
        <SplitSectionItem className="h-full">
          <Div className="grid grid-rows-3 h-full">
            {/* Image 1 - Climate */}
            <Div className="relative w-full h-full">
              <Image
                src="/images/climate.webp"
                alt="Climate change and extreme weather illustration"
                fill
                className="object-cover"
              />
            </Div>

            {/* Image 2 - Network */}
            <Div className="relative w-full h-full">
              <Image
                src="/images/network.webp"
                alt="International standards network (GRI, SFDR, CSRD)"
                fill
                className="object-cover"
              />
            </Div>

            {/* Image 3 - Nature */}
            <Div className="relative w-full h-full">
              <Image
                src="/images/nature.webp"
                alt="Sustainable growth and ESG frameworks"
                fill
                className="object-cover"
              />
            </Div>
          </Div>
        </SplitSectionItem>
      </SplitSection>
      {/* Data Transformation Section */}
      <Section size="full">
        <H2 size="h3">GreenPulse.AI: Transform complex Data into impact strategies</H2>
        <Div>
          <Div size={'xs'} className="bg-gp-gradient w-full rounded-full relative"></Div>
          {/* 3-Step Process with AI in center */}
          <Div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto ">
            {/* Arrow connections - Desktop only */}
            <Div className="hidden md:block absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
              <Icon name="lucide:ArrowRight" size={30} className=" text-gp-primary" />
            </Div>
            <Div className="hidden md:block absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
              <Icon name="lucide:ArrowRight" size={30} className="font-black text-gp-secondary" />
            </Div>
            {/* Step 1: Discuss & Upload */}
            <Card variant="ghost" className="relative space-y-4">
              <CardHeader className="flex items-center">
                <Badge circle circleSize={'lg'} className="bg-gp-gradient-from">
                  1
                </Badge>
                <H3 size="h5" className="ml-2 w-fit">
                  DISCUSS & UPLOAD
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
                <Badge circle circleSize={'lg'} className="bg-gp-gradient-via">
                  2
                </Badge>
                <H3 size="h5" className="ml-2 w-fit">
                  LET GPA WORKS FOR YOU
                </H3>
              </CardHeader>
              <CardContent className="flex justify-center items-center">
                <Div className="bg-gp-gradient border-4 border-primary rounded-2xl p-8 w-fit">
                  <Icon name="lucide:Brain" size={30} />
                </Div>
              </CardContent>
            </Card>
            {/* Step 3: Get Results */}
            <Card variant="ghost" className="relative space-y-4">
              <CardHeader className="flex items-center ">
                <Badge circle circleSize={'lg'} className="bg-gp-gradient-to">
                  3
                </Badge>
                <H3 size="h5" className="ml-2 w-fit">
                  GET YOUR STRATEGY & KPIs
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
          {/* Data Extraction */}
          <Card variant="outline">
            <CardHeader>
              <Div className="flex items-center gap-3 mb-3">
                <Icon name="lucide:Database" className="w-8 h-8 text-primary" />
                <H3 size="h5">Powerful data extraction & centralisation</H3>
              </Div>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">
                Voice, photo, and seamless integration with existing software (ERP, CRM, Excel) for
                automated data extraction and pre-filling.
              </P>
            </CardContent>
          </Card>

          {/* ESG Analysis */}
          <Card variant="outline">
            <CardHeader>
              <Div className="flex items-center gap-3 mb-3">
                <Icon name="lucide:TrendingUp" className="w-8 h-8 text-primary" />
                <H3 size="h5">Instant ESG Analysis</H3>
              </Div>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">
                Real-time evaluation and scoring of projects and portfolios with customizable ESG
                criteria and instant recommendations.
              </P>
            </CardContent>
          </Card>

          {/* Strategy & Reporting */}
          <Card variant="outline">
            <CardHeader>
              <Div className="flex items-center gap-3 mb-3">
                <Icon name="lucide:FileText" className="w-8 h-8 text-primary" />
                <H3 size="h5">Tailored Strategy & Reporting</H3>
              </Div>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">
                Conversational AI agent for personalized recommendations and compliant reports (GRI,
                SFDR) tailored to your needs.
              </P>
            </CardContent>
          </Card>
        </Div>
      </Section>
      {/* Value Proposition Section */}
      <Section size={'xl'}>
        <Div className="container mx-auto">
          <Card className="max-w-4xl mx-auto p-8 lg:p-12 border-l-4 border-primary">
            <P className="text-lg lg:text-xl  mb-6 leading-relaxed">{t('value.intro')}</P>
            <Div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  icon: 'lucide:MessageCircle',
                  text: t('value.points.chat'),
                },
                { icon: 'lucide:Gauge', text: t('value.points.measure') },
                {
                  icon: 'lucide:TrendingUp',
                  text: t('value.points.improve'),
                },
                {
                  icon: 'lucide:Target',
                  text: t('value.points.roadmap'),
                },
                {
                  icon: 'lucide:Banknote',
                  text: t('value.points.qualify'),
                },
              ].map((item, index) => (
                <Div key={index} className="flex items-start space-x-3">
                  <Icon
                    name={item.icon as KnownIconName}
                    className="w-6 h-6 text-primary mt-1 flex-shrink-0"
                  />
                  <P className="">{item.text}</P>
                </Div>
              ))}
            </Div>
          </Card>
        </Div>
      </Section>

      {/* Example Interaction Section */}
      <Section size={'xl'} className="max-w-full bg-gp-gradient">
        <H3>{t('example.title')}</H3>
        <Card variant={'ghost'} className="p-0 space-y-6">
          <Div className="shadow-sm bg-muted/50 p-6 rounded-xl border-l-4 border-primary">
            <Div className="flex items-start space-x-3 ">
              <Icon name="lucide:User" className="w-6 h-6 text-primary mt-1" />
              <Div>
                <P className="font-semibold text-primary mb-2">{t('example.user')}</P>
                <P className="">{t('example.userMessage')}</P>
              </Div>
            </Div>
          </Div>

          <Div className="bg-accent/50 p-6 rounded-xl border-l-4 border-accent-foreground">
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
      <Section size={'full'}>
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
                  <Icon name="lucide:MessageCircle" className="w-5 h-5 text-primary" />
                  <P className="">{t('packages.free.features.chat')}</P>
                </Div>
              </Div>
            </Card>

            {/* Premium Package */}
            <Card className="p-8 border-2 border-primary/30 bg-card relative">
              <Div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <P className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                  {t('packages.premium.badge')}
                </P>
              </Div>

              <Div className="text-center mb-6">
                <Icon name="lucide:TrendingUp" className="w-12 h-12 text-primary mx-auto mb-4" />
                <H3 className="text-2xl font-bold text-foreground mb-2">
                  {t('packages.premium.title')}
                </H3>
                <P className="text-sm font-medium text-primary uppercase tracking-wide">
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
                    <Icon name={item.icon as KnownIconName} className="w-5 h-5 text-primary" />
                    <P className="text-sm">{item.text}</P>
                  </Div>
                ))}
              </Div>
            </Card>

            {/* Golden Package */}
            <Card className="p-8 border-2 border-amber-300 bg-card">
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
      <Section size={'xl'} className="max-w-full bg-gp-gradient">
        <Div className="container mx-auto text-center">
          <Div className="max-w-3xl mx-auto">
            <H3 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-6">
              {t('cta.title')}
            </H3>
            <P className="text-xl text-primary-foreground/90 mb-8">{t('cta.description')}</P>
            <Form {...form}>
              <Div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={t('hero.emailPlaceholder')}
                          {...field}
                          className="bg-white"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  onClick={form.handleSubmit(onSubmit)}
                  className="bg-background text-primary hover:bg-background/80 font-semibold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {t('cta.joinWaitlist')}
                </Button>
              </Div>
            </Form>
          </Div>
        </Div>
      </Section>
    </>
  )
}
