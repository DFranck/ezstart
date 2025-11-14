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
  Span,
  SplitSection,
  SplitSectionItem,
  Strong,
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
        const response = await fetch(`${apiUrl}/api/waitlist/green-pulse/add`, {
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
      <Section size={'full'} className={'t'}>
        <Div layout={'row'}>
          <Image
            src="/logo.png"
            alt="Logo"
            width={60}
            height={60}
            className="animate-pulse"
            style={{
              filter:
                'drop-shadow(0 0 8px rgb(16 185 129 / 1)) drop-shadow(0 0 16px rgb(16 185 129 / 0.8))',
            }}
          />

          <H1>
            {t('hero.title')}
            <span className="font-gugi font-medium text-gp-primary">.AI</span>
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
            className="text-gp-primary text-center"
            duration={3}
            delay={0.5}
          />
        </Div>
        {/* CTA Form (from v2) */}
        <Div className=" backdrop-blur-md rounded-2xl p-6 sm:p-8 lg:p-10 shadow-xl max-w-2xl mx-auto">
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
              <Button
                type="submit"
                onClick={form.handleSubmit(onSubmit)}
                className="bg-gp-primary hover:bg-gp-primary/80"
              >
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
        className="lg:pb-20"
      >
        {/* Left side - Content */}
        <SplitSectionItem size="xl" className="xl:mx-20">
          <H3 size={'h4'} className="text-xl lg:text-2xl font-bold mb-6 leading-tight">
            The world is facing <Strong className="text-warning">extreme weather</Strong> due to
            climate change, Companies are pushed to move beyond Business as Usual and to aim to
            sustainable growth.
          </H3>

          <Div className="space-y-4">
            {[
              'Limited resources to establish robust ESG frameworks and demonstrate real climate impact',
              'Lack of structured documentation to meet investor ESG requirements for fundraising',
              'Gaps in expertise to navigate international standards (GRI, SFDR, CSRD) required by impact investors',
            ].map((challenge, index) => (
              <Div key={index} className="flex items-start gap-3">
                <Div className="w-2 h-2 bg-gp-primary rounded-full mt-2 flex-shrink-0" />
                <P className="text-base lg:text-lg text-muted-foreground">{challenge}</P>
              </Div>
            ))}
          </Div>
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
      {/* Data Transformation Section */}
      <Section size="xl">
        <H2 size="h3">GreenPulse.AI easily transform complex Data into impact strategies</H2>
        <Div>
          {/* 3-Step Process with AI in center */}
          <Div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto ">
            {/* Step 1: Discuss & Upload */}
            <Card variant="ghost" className="relative space-y-4">
              <CardHeader className="flex items-center">
                <Badge circle circleSize={'lg'} className="bg-gp-primary">
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
                <Badge circle circleSize={'lg'} className="bg-gp-primary">
                  2
                </Badge>
                <H3 size="h5" className="ml-2 w-fit">
                  LET GPA WORKS FOR YOU
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
          <Card>
            <CardHeader className="flex items-center gap-3">
              <Icon name="lucide:Database" size={30} />
              <H3 size="h6" className="w-fit">
                Powerful data extraction & centralisation
              </H3>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">
                Voice, photo, and seamless integration with existing software (ERP, CRM, Excel) for
                automated data extraction and pre-filling.
              </P>
            </CardContent>
          </Card>

          {/* ESG Analysis */}
          <Card>
            <CardHeader className="flex items-center gap-3">
              <Icon name="lucide:TrendingUp" size={30} />
              <H3 size="h6">Instant ESG Analysis</H3>
            </CardHeader>
            <CardContent>
              <P className="text-muted-foreground">
                Real-time evaluation and scoring of projects and portfolios with customizable ESG
                criteria and instant recommendations.
              </P>
            </CardContent>
          </Card>

          {/* Strategy & Reporting */}
          <Card>
            <CardHeader className="flex items-center gap-3">
              <Icon name="lucide:FileText" size={30} />
              <H3 size="h6">Tailored Strategy & Reporting</H3>
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
      {/* Problem Statement Section */}
      <Section size={'xl'}>
        <Div className="container mx-auto">
          <Div className="text-center mb-12">
            <H2 size="h3" className="mb-4">
              Sustainability Teams Are <Strong className="text-warning">Drowning</Strong> in
              Complexity
            </H2>
            <P className="text-xl text-muted-foreground max-w-3xl mx-auto">
              You're not alone.{' '}
              <Strong className="text-gp-primary">78% of sustainability managers</Strong> and{' '}
              <Strong className="text-gp-primary">SMIs</Strong> report feeling overwhelmed by data
              collection, compliance requirements, and stakeholder expectations.
            </P>
          </Div>

          <Div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: 'lucide:Clock',
                title: 'Hours Lost to Manual Work',
                descriptionHtml:
                  'Data entry, supplier emails, and report compilation consume <strong class="text-gp-primary ">60% of your week</strong> leaving little time for strategic initiatives.',
              },
              {
                icon: 'lucide:FileWarning',
                title: 'Compliance Anxiety',
                descriptionHtml:
                  'Keeping up with <strong class="text-gp-primary ">GRI, SFDR, CSRD, and ISSB</strong> frameworks feels like a full-time job. One missed update could derail investor confidence.',
              },
              {
                icon: 'lucide:Users',
                title: 'Resource Constraints',
                descriptionHtml:
                  'Your team is expected to deliver <strong class="text-gp-primary">enterprise-grade ESG programs</strong>, but budgets and headcount remain frozen.',
              },
            ].map((item, index) => (
              <Card key={index}>
                <CardHeader className="flex items-center gap-3">
                  <Icon name={item.icon as KnownIconName} size={30} className="mr-3" />
                  <H3 size="h6" className="w-fit">
                    {item.title}
                  </H3>
                </CardHeader>
                <CardContent>
                  <P
                    className="text-muted-foreground text-sm"
                    dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
                  />
                </CardContent>
              </Card>
            ))}
          </Div>
        </Div>
      </Section>
      {/* Team Credibility Section */}
      <Section size={'xl'} layout={'grid'}>
        <Div className="px-6 py-12 md:px-12">
          <H2 size="h3" className="mb-6">
            Built by ESG Experts, Not Just Engineers
          </H2>
          <P className="text-lg text-muted-foreground mb-6 leading-relaxed">
            GreenPulse.AI is created by sustainability professionals who've spent years in the
            trenches—navigating compliance frameworks, managing stakeholder expectations, and
            transforming raw data into actionable strategies.
          </P>
          <Div className="space-y-4">
            {[
              {
                icon: 'lucide:Award',
                text: '20+ years combined experience in ESG consulting and corporate sustainability',
              },
              {
                icon: 'lucide:GraduationCap',
                text: 'Certified GHG Protocol practitioners and ISSB framework specialists',
              },
              {
                icon: 'lucide:Building2',
                text: 'Worked with Fortune 500 companies and impact investors across 15+ industries',
              },
            ].map((item, index) => (
              <Div key={index} className="flex items-start gap-3">
                <Icon name={item.icon as KnownIconName} className="w-6 h-6  mt-1 flex-shrink-0" />
                <P className="text-base">{item.text}</P>
              </Div>
            ))}
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
      <Section size={'xl'} className="bg-background">
        <Div className="container mx-auto">
          <H2 size="h4" className="text-center mb-12">
            Trusted by Forward-Thinking Organizations
          </H2>
          Option 1:
          <Div className="text-center max-w-3xl mx-auto mb-16">
            <H3 size="h5" className="mb-4">
              Integration Partners
            </H3>
            <P className="text-muted-foreground">
              GreenPulse integrates with leading ESG platforms and reporting frameworks.
              <Strong className="text-foreground"> We're expanding our partner ecosystem</Strong> to
              help companies streamline their sustainability workflows across multiple platforms.
            </P>
            <P className="text-sm text-muted-foreground mt-4">
              Platform provider?{' '}
              <a href="#contact" className="text-primary hover:underline">
                Let's discuss integration opportunities
              </a>
            </P>
          </Div>
          Option 2 :
          <Div className="text-center max-w-3xl mx-auto mb-16">
            <H3 size="h5" className="mb-4">
              Built for Interoperability
            </H3>
            <P className="text-muted-foreground">
              GreenPulse acts as a <Strong className="text-foreground">central hub</Strong> that
              connects to ESG platforms, rating agencies, and reporting tools—helping users manage
              data across their entire sustainability tech stack.
            </P>
            <Div className="mt-6 p-4 bg-muted/30 rounded-lg border border-border">
              <P className="text-sm">
                <Strong>For Platform Partners:</Strong> Expand your reach with seamless API
                integration. Acquire customers through our network while enriching your data
                ecosystem.
              </P>
            </Div>
          </Div>
          Option 3 :
          <Div className="text-center max-w-2xl mx-auto mb-16">
            <H3 size="h5" className="text-muted-foreground mb-3">
              Integration Ecosystem
            </H3>
            <P className="text-muted-foreground text-sm">
              We connect to ESG platforms, reporting frameworks, and rating agencies through secure
              APIs.
              <br />
              <a
                href="mailto:partnerships@greenpulse.ai"
                className="text-primary hover:underline mt-2 inline-block"
              >
                Platform providers: explore partnership opportunities →
              </a>
            </P>
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
              As Featured In
            </H3>
            <Div layout={'center'} className="max-w-3xl mx-auto">
              {[
                {
                  publication: 'VietStock',
                  quote: '"Tay xanh" dưới góc nhìn của chuyên gia tư vấn ESG quốc tế',
                  logo: '/images/vietstock.svg',
                  url: 'https://vietstock.vn/2025/11/tay-xanh-duoi-goc-nhin-cua-chuyen-gia-tu-van-esg-quoc-te-761-1365211.htm',
                  date: 'November 2025',
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
                    <Div className="flex items-start gap-6">
                      <Div className="flex-shrink-0 w-32 h-12 relative">
                        <Image
                          src={item.logo}
                          alt={item.publication}
                          fill
                          className="object-contain"
                        />
                      </Div>
                      <Div className="flex-1">
                        <P className="font-semibold mb-2">
                          {item.publication}{' '}
                          <Span size={'xs'} variant={'description'}>
                            {item.date}
                          </Span>
                        </P>
                        <P className="text-muted-foreground italic">{item.quote}</P>
                      </Div>
                    </Div>
                  </Card>
                </a>
              ))}
            </Div>
          </Div>
        </Div>
      </Section>
      {/* FAQ Section */}
      <Section size={'xl'} className="bg-muted/30">
        <Div className="container mx-auto max-w-4xl">
          <H2 size="h3" className="text-center mb-12">
            Common Questions
          </H2>

          <Div className="space-y-4">
            {[
              {
                question: 'How is GreenPulse different from ChatGPT or other general AI tools?',
                answer:
                  "GreenPulse is purpose-built for ESG compliance and sustainability reporting. Unlike ChatGPT, we're trained on international frameworks (GRI, SFDR, CSRD, ISSB) and integrate with your existing data sources (ERP, CRM, Excel). We provide structured outputs that meet regulatory requirements—not generic text that needs manual review.",
              },
              {
                question: 'Is my data secure? Do you share it with third parties?',
                answer:
                  'Your data is encrypted end-to-end and stored in SOC 2 Type II compliant infrastructure. We never share your data with third parties or use it to train AI models. All processing happens within your secure tenant, and you maintain full ownership of your sustainability data.',
              },
              {
                question: "Doesn't AI generate emissions? How do you manage this?",
                answer:
                  "Yes, AI computing does generate emissions—which is why we offset 200% of our carbon footprint through verified carbon removal projects. More importantly, GreenPulse's automation reduces the need for travel, paper reports, and redundant manual work, resulting in a net-negative carbon impact for our users.",
              },
              {
                question: 'Can GreenPulse integrate with our existing tools?',
                answer:
                  'Absolutely. GreenPulse connects with major ERP systems (SAP, Oracle), CRMs (Salesforce, HubSpot), and data sources (Excel, Google Sheets, CSV). Our API allows custom integrations for proprietary systems. Most implementations are live within 2 weeks.',
              },
              {
                question: 'What if GreenPulse makes a mistake in compliance reporting?',
                answer:
                  'GreenPulse provides transparency in all outputs—showing which frameworks and data points inform each recommendation. All reports include human-in-the-loop review checkpoints before finalization. We also offer audit trails and version control to ensure regulatory confidence.',
              },
            ].map((item, index) => (
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
            <H3 className="text-3xl lg:text-4xl font-bold  mb-6">{t('cta.title')}</H3>
            <P className="text-xl mb-8">{t('cta.description')}</P>
            <Form {...form}>
              <Div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
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
