'use client'

import { useSafeTranslations } from '@/hooks/useSafeIntl'
import {
  AuroraBackground,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Div,
  H1,
  H2,
  H3,
  Icon,
  KnownIconName,
  LampContainer,
  Main,
  P,
  Section,
  Span,
  TextGradient,
} from '@ezstart/ui/components'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'

type ProductCardData = {
  slug: string
  name: string
  tagline: string
  description: string
  iconName: KnownIconName | string
  href: string
  badge?: string
}

type PortfolioProjectData = {
  title: string
  subtitle: string
  summary: string
  tech: string[]
  href?: string
  private?: boolean
}

type OssPackageData = {
  name: string
  description: string
  scope: string
}

export default function SaasPreviewPage(): React.JSX.Element {
  const t = useSafeTranslations('saas-preview')
  const locale = useLocale()

  const products = t.raw('products.items') as ProductCardData[]
  const projects = t.raw('portfolio.projects') as PortfolioProjectData[]
  const packages = t.raw('oss.items') as OssPackageData[]
  const skills = t.raw('founder.skills') as string[]

  return (
    <Main className="overflow-hidden">
      {/* ================= Hero SaaS ================= */}
      <AuroraBackground id="saas-preview-hero">
        <Section size="lg" className="py-24 md:py-32 text-center">
          <Div size="sm" className="mx-auto items-center">
            <Badge variant="primary" size="sm" className="mb-6">
              {t('hero.badge')}
            </Badge>
            <H1 size="giant" className="text-balance">
              <TextGradient from="ezstart" via="primary" to="ezstart" speed={6}>
                {t('hero.title')}
              </TextGradient>
            </H1>
            <P variant="description" className="mx-auto max-w-2xl mt-6 text-lg">
              {t('hero.subtitle')}
            </P>
            <Div layout="row" className="gap-3 justify-center flex-wrap mt-8">
              <Button asChild size="lg">
                <Link href="#saas-preview-products">{t('hero.ctaPrimary')}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#saas-preview-founder">{t('hero.ctaSecondary')}</Link>
              </Button>
            </Div>
          </Div>
        </Section>
      </AuroraBackground>

      {/* ================= Products Grid ================= */}
      <Section id="saas-preview-products" size="lg" className="py-16 md:py-24">
        <Div size="sm" className="mx-auto items-center text-center mb-12">
          <H2>{t('products.title')}</H2>
          <P variant="description" className="mt-3 max-w-2xl">
            {t('products.subtitle')}
          </P>
        </Div>

        <Div
          layout="grid"
          className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full"
        >
          {products.map(product => (
            <Card key={product.slug} variant="floating" className="h-full">
              <CardHeader>
                <Div layout="row" className="items-center gap-3">
                  <Div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon name={product.iconName as KnownIconName} size={28} />
                  </Div>
                  <Div size="default" className="flex-1 items-start">
                    <CardTitle className="text-xl">{product.name}</CardTitle>
                    {product.badge && (
                      <Badge variant="secondary" size="xs" className="mt-1">
                        {product.badge}
                      </Badge>
                    )}
                  </Div>
                </Div>
                <CardDescription className="mt-3 text-left">{product.tagline}</CardDescription>
              </CardHeader>
              <CardContent>
                <P size="xs" variant="description" className="text-left">
                  {product.description}
                </P>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={product.href} target="_blank" rel="noopener noreferrer">
                    {t('products.visitCta')}
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </Div>
      </Section>

      {/* ================= Built by Franck ================= */}
      <Section id="saas-preview-founder" size="lg" className="py-16 md:py-24 bg-muted/30">
        <Div
          layout="grid"
          className="grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-12 items-center max-w-5xl mx-auto"
        >
          <Div className="items-center">
            <Image
              src="/images/franck_no_background.png"
              alt="Franck Dufournet"
              width={500}
              height={500}
              className="rounded-full object-cover shadow-md border-4 border-primary w-[180px] h-[180px] md:w-[260px] md:h-[260px]"
            />
          </Div>
          <Div size="sm" className="items-start text-left">
            <Badge variant="outline" size="sm">
              {t('founder.badge')}
            </Badge>
            <H2 className="mt-3">{t('founder.title')}</H2>
            <P variant="description" className="text-lg">
              {t('founder.tagline')}
            </P>
            <P size="xs" className="text-muted-foreground leading-relaxed">
              {t('founder.bio')}
            </P>
            <Div layout="row" className="gap-2 flex-wrap mt-3">
              {skills.map(skill => (
                <Badge key={skill} variant="secondary" size="sm">
                  {skill}
                </Badge>
              ))}
            </Div>
            <Div layout="row" className="gap-3 mt-4 flex-wrap">
              <Button asChild variant="default" size="sm">
                <Link href="#saas-preview-projects">{t('founder.ctaProjects')}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link
                  href="https://www.linkedin.com/in/franck-seradni/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Icon name="fa:FaLinkedin" size={16} />
                  <Span className="ml-2">LinkedIn</Span>
                </Link>
              </Button>
            </Div>
          </Div>
        </Div>
      </Section>

      {/* ================= Selected Projects ================= */}
      <Section id="saas-preview-projects" size="lg" className="py-16 md:py-24">
        <Div size="sm" className="mx-auto items-center text-center mb-12">
          <H2>{t('portfolio.title')}</H2>
          <P variant="description" className="mt-3 max-w-2xl">
            {t('portfolio.subtitle')}
          </P>
        </Div>

        <Div
          layout="grid"
          className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 w-full"
        >
          {projects.map(project => (
            <Card key={project.title} variant="elevated" className="h-full">
              <CardHeader>
                <CardTitle className="text-lg">{project.title}</CardTitle>
                <CardDescription className="text-left">{project.subtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <P size="xs" variant="description" className="text-left">
                  {project.summary}
                </P>
                <Div layout="row" className="gap-1 flex-wrap mt-3">
                  {project.tech.slice(0, 5).map(tech => (
                    <Badge key={tech} variant="outline" size="xs">
                      {tech}
                    </Badge>
                  ))}
                </Div>
              </CardContent>
              <CardFooter>
                {project.href ? (
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={project.href} target="_blank" rel="noopener noreferrer">
                      {t('portfolio.viewCta')}
                    </Link>
                  </Button>
                ) : (
                  <Badge variant="secondary" size="sm" className="w-full justify-center">
                    {t('portfolio.privateLabel')}
                  </Badge>
                )}
              </CardFooter>
            </Card>
          ))}
        </Div>
      </Section>

      {/* ================= Open-Source Packages ================= */}
      <Section id="saas-preview-oss" size="lg" className="py-16 md:py-24 bg-muted/30">
        <Div size="sm" className="mx-auto items-center text-center mb-12">
          <H2>{t('oss.title')}</H2>
          <P variant="description" className="mt-3 max-w-2xl">
            {t('oss.subtitle')}
          </P>
        </Div>

        <Div
          layout="grid"
          className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 w-full"
        >
          {packages.map(pkg => (
            <Card key={pkg.scope} variant="ghost" className="h-full">
              <CardHeader>
                <Div layout="row" className="items-center gap-2">
                  <Icon name="fa:FaCode" size={18} />
                  <CardTitle className="text-base">{pkg.name}</CardTitle>
                </Div>
                <Span className="text-xs text-muted-foreground font-mono">{pkg.scope}</Span>
              </CardHeader>
              <CardContent>
                <P size="xs" variant="description" className="text-left">
                  {pkg.description}
                </P>
              </CardContent>
            </Card>
          ))}
        </Div>

        <Div className="items-center mt-10">
          <Button asChild variant="outline" size="sm">
            <Link
              href="https://github.com/DFranck/ez-start"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Icon name="fa:FaGithub" size={16} />
              <Span className="ml-2">{t('oss.githubCta')}</Span>
            </Link>
          </Button>
        </Div>
      </Section>

      {/* ================= Support / Donation ================= */}
      <Section id="saas-preview-support" size="lg" className="py-16 md:py-24">
        <Div size="sm" className="mx-auto items-center text-center">
          <Badge variant="primary" size="sm">
            {t('support.badge')}
          </Badge>
          <H2 className="mt-3">{t('support.title')}</H2>
          <P variant="description" className="mt-3 max-w-xl">
            {t('support.description')}
          </P>
          <Div layout="row" className="gap-3 mt-6 flex-wrap justify-center">
            <Button asChild size="lg">
              <Link href={`/${locale}/donate`}>
                <Icon name="fa:FaHeart" size={16} />
                <Span className="ml-2">{t('support.donateCta')}</Span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link
                href="https://github.com/DFranck/ez-start"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="fa:FaGithub" size={16} />
                <Span className="ml-2">{t('support.starCta')}</Span>
              </Link>
            </Button>
          </Div>
        </Div>
      </Section>

      {/* ================= Work with me ================= */}
      <Div id="saas-preview-contact">
        <LampContainer>
          <H2 className="md:text-center">{t('contact.title')}</H2>
          <P variant="description" className="max-w-2xl mx-auto text-center">
            {t('contact.description')}
          </P>
          <Div layout="row" className="gap-3 flex-wrap justify-center mt-6">
            <Button asChild size="lg">
              <Link href="mailto:franckdufournet@hotmail.fr">
                <Icon name="fa:FaEnvelope" size={16} />
                <Span className="ml-2">{t('contact.emailCta')}</Span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link
                href="https://www.linkedin.com/in/franck-seradni/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="fa:FaLinkedin" size={16} />
                <Span className="ml-2">LinkedIn</Span>
              </Link>
            </Button>
          </Div>
        </LampContainer>
      </Div>

      {/* ================= Footer LLC ================= */}
      <Section size="md" className="py-12 border-t border-border">
        <Div size="sm" className="mx-auto items-center text-center">
          <H3 size="h5">{t('footer.company')}</H3>
          <P size="xs" variant="description" className="max-w-xl">
            {t('footer.llcInfo')}
          </P>
          <Div layout="row" className="gap-4 flex-wrap justify-center mt-4">
            <Link
              href="https://github.com/DFranck/ez-start"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="hover:opacity-80"
            >
              <Icon name="fa:FaGithub" size={20} />
            </Link>
            <Link
              href="https://www.linkedin.com/in/franck-seradni/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="hover:opacity-80"
            >
              <Icon name="fa:FaLinkedin" size={20} />
            </Link>
            <Link
              href="mailto:franckdufournet@hotmail.fr"
              aria-label="Email"
              className="hover:opacity-80"
            >
              <Icon name="fa:FaEnvelope" size={20} />
            </Link>
          </Div>
          <Span className="text-xs text-muted-foreground mt-6">{t('footer.draftNote')}</Span>
        </Div>
      </Section>
    </Main>
  )
}
