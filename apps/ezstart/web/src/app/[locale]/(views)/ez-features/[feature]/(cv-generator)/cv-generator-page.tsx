'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Div,
  H1,
  H3,
  Icon,
  Input,
  Label,
  P,
  Section,
  Span,
  Spinner,
} from '@ezstart/ui/components'
import { RequireAuth, AccessDenied, LoginButton } from '@ezstart/auth-sdk'
import { RequireRole, InsufficientPermissions } from '@ezstart/rbac'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { logger } from '@ezstart/logger'
import { useState } from 'react'
import { toast } from 'sonner'
import { CVPreview } from './components/cv-preview'
import { TemplateSelector } from './components/template-selector'
import { CVConfig, CVData } from './types'

const DEFAULT_DATA: CVData = {
  personalInfo: {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    linkedIn: '',
    github: '',
    website: '',
  },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
}

const DEFAULT_CONFIG: CVConfig = {
  template: 'professional',
  primaryColor: '#2563eb',
  useAI: false,
  aiSources: {
    githubUsername: '',
    linkedInProfile: '',
    additionalContext: '',
  },
}

function CVGeneratorContent() {
  const t = useSafeTranslations('cvGenerator')
  const [data, setData] = useState<CVData>(DEFAULT_DATA)
  const [config, setConfig] = useState<CVConfig>(DEFAULT_CONFIG)
  const [jobPosting, setJobPosting] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleReset = () => {
    setData(DEFAULT_DATA)
    setConfig(DEFAULT_CONFIG)
    setJobPosting('')
  }

  const updateData = (updates: Partial<CVData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const updateConfig = (updates: Partial<CVConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const handleAIGenerate = async () => {
    if (!jobPosting) {
      toast.error(t('generator.errors.jobPostingRequired'))
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPosting,
          currentData: data,
          sources: config.aiSources,
        }),
      })

      if (!response.ok) throw new Error('Generation failed')

      const generatedData = await response.json()
      setData(generatedData)
    } catch (error) {
      logger.error('AI generation error:', error)
      toast.error(t('generator.errors.generationFailed'))
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:FileText" className="w-16 h-16 text-primary mb-4" />
          <H1>{t('hero.title')}</H1>
          <P size="lg" className="text-muted-foreground max-w-2xl">
            {t('hero.description')}
          </P>
        </Div>
      </Section>

      {/* Generator Section */}
      <Section size="default">
        <Div className="grid lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Div className="space-y-6">
            {/* AI Configuration */}
            <Card variant="elevated">
              <CardHeader>
                <H3>{t('generator.aiConfig.title')}</H3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Div className="flex items-center gap-2">
                  <input
                    id="use-ai"
                    type="checkbox"
                    checked={config.useAI}
                    onChange={e => updateConfig({ useAI: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="use-ai" className="cursor-pointer">
                    {t('generator.aiConfig.useAiLabel')}
                  </Label>
                </Div>

                {config.useAI && (
                  <>
                    <Div className="space-y-2">
                      <Label htmlFor="job-posting">
                        {t('generator.aiConfig.jobPostingLabel')} *
                      </Label>
                      <textarea
                        id="job-posting"
                        placeholder={t('generator.aiConfig.jobPostingPlaceholder')}
                        value={jobPosting}
                        onChange={e => setJobPosting(e.target.value)}
                        className="w-full h-32 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                        required={config.useAI}
                      />
                    </Div>

                    <Div className="space-y-2">
                      <Label htmlFor="github-username">{t('generator.aiConfig.githubLabel')}</Label>
                      <Input
                        id="github-username"
                        placeholder={t('generator.aiConfig.githubPlaceholder')}
                        value={config.aiSources.githubUsername}
                        onChange={e =>
                          updateConfig({
                            aiSources: { ...config.aiSources, githubUsername: e.target.value },
                          })
                        }
                      />
                      <P className="text-xs text-muted-foreground">
                        {t('generator.aiConfig.githubHelp')}
                      </P>
                    </Div>

                    <Div className="space-y-2">
                      <Label htmlFor="linkedin-profile">
                        {t('generator.aiConfig.linkedInLabel')}
                      </Label>
                      <Input
                        id="linkedin-profile"
                        type="url"
                        placeholder={t('generator.aiConfig.linkedInPlaceholder')}
                        value={config.aiSources.linkedInProfile}
                        onChange={e =>
                          updateConfig({
                            aiSources: { ...config.aiSources, linkedInProfile: e.target.value },
                          })
                        }
                      />
                    </Div>

                    <Div className="space-y-2">
                      <Label htmlFor="additional-context">
                        {t('generator.aiConfig.additionalContextLabel')}
                      </Label>
                      <textarea
                        id="additional-context"
                        placeholder={t('generator.aiConfig.additionalContextPlaceholder')}
                        value={config.aiSources.additionalContext}
                        onChange={e =>
                          updateConfig({
                            aiSources: { ...config.aiSources, additionalContext: e.target.value },
                          })
                        }
                        className="w-full h-24 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                      />
                    </Div>

                    <Button
                      onClick={handleAIGenerate}
                      disabled={isGenerating || !jobPosting}
                      className="w-full"
                    >
                      {isGenerating ? (
                        <>
                          <Icon name="lucide:Loader2" size={16} spin ariaHidden />
                          <Span className="ml-2">{t('generator.aiConfig.generating')}</Span>
                        </>
                      ) : (
                        <>
                          <Icon name="lucide:Sparkles" size={16} ariaHidden />
                          <Span className="ml-2">{t('generator.aiConfig.generateButton')}</Span>
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Personal Info */}
            <Card variant="elevated">
              <CardHeader>
                <H3>{t('generator.personalInfo.title')}</H3>
              </CardHeader>
              <CardContent className="space-y-4">
                <Div className="space-y-2">
                  <Label htmlFor="cv-name">{t('generator.personalInfo.nameLabel')} *</Label>
                  <Input
                    id="cv-name"
                    placeholder={t('generator.personalInfo.namePlaceholder')}
                    value={data.personalInfo.name}
                    onChange={e =>
                      updateData({
                        personalInfo: { ...data.personalInfo, name: e.target.value },
                      })
                    }
                    required
                  />
                </Div>

                <Div className="space-y-2">
                  <Label htmlFor="cv-title">{t('generator.personalInfo.titleLabel')} *</Label>
                  <Input
                    id="cv-title"
                    placeholder={t('generator.personalInfo.titlePlaceholder')}
                    value={data.personalInfo.title}
                    onChange={e =>
                      updateData({
                        personalInfo: { ...data.personalInfo, title: e.target.value },
                      })
                    }
                    required
                  />
                </Div>

                <Div className="grid grid-cols-2 gap-4">
                  <Div className="space-y-2">
                    <Label htmlFor="cv-email">{t('generator.personalInfo.emailLabel')}</Label>
                    <Input
                      id="cv-email"
                      type="email"
                      placeholder={t('generator.personalInfo.emailPlaceholder')}
                      value={data.personalInfo.email}
                      onChange={e =>
                        updateData({
                          personalInfo: { ...data.personalInfo, email: e.target.value },
                        })
                      }
                    />
                  </Div>

                  <Div className="space-y-2">
                    <Label htmlFor="cv-phone">{t('generator.personalInfo.phoneLabel')}</Label>
                    <Input
                      id="cv-phone"
                      type="tel"
                      placeholder={t('generator.personalInfo.phonePlaceholder')}
                      value={data.personalInfo.phone}
                      onChange={e =>
                        updateData({
                          personalInfo: { ...data.personalInfo, phone: e.target.value },
                        })
                      }
                    />
                  </Div>
                </Div>

                <Div className="space-y-2">
                  <Label htmlFor="cv-location">{t('generator.personalInfo.locationLabel')}</Label>
                  <Input
                    id="cv-location"
                    placeholder={t('generator.personalInfo.locationPlaceholder')}
                    value={data.personalInfo.location}
                    onChange={e =>
                      updateData({
                        personalInfo: { ...data.personalInfo, location: e.target.value },
                      })
                    }
                  />
                </Div>

                <Div className="grid grid-cols-2 gap-4">
                  <Div className="space-y-2">
                    <Label htmlFor="cv-github">{t('generator.personalInfo.githubLabel')}</Label>
                    <Input
                      id="cv-github"
                      placeholder={t('generator.personalInfo.githubPlaceholder')}
                      value={data.personalInfo.github}
                      onChange={e =>
                        updateData({
                          personalInfo: { ...data.personalInfo, github: e.target.value },
                        })
                      }
                    />
                  </Div>

                  <Div className="space-y-2">
                    <Label htmlFor="cv-linkedin">{t('generator.personalInfo.linkedInLabel')}</Label>
                    <Input
                      id="cv-linkedin"
                      placeholder={t('generator.personalInfo.linkedInPlaceholder')}
                      value={data.personalInfo.linkedIn}
                      onChange={e =>
                        updateData({
                          personalInfo: { ...data.personalInfo, linkedIn: e.target.value },
                        })
                      }
                    />
                  </Div>
                </Div>
              </CardContent>
            </Card>

            {/* Professional Summary */}
            <Card variant="elevated">
              <CardHeader>
                <H3>{t('generator.summary.title')}</H3>
              </CardHeader>
              <CardContent>
                <Div className="space-y-2">
                  <Label htmlFor="cv-summary">{t('generator.summary.label')}</Label>
                  <textarea
                    id="cv-summary"
                    placeholder={t('generator.summary.placeholder')}
                    value={data.summary}
                    onChange={e => updateData({ summary: e.target.value })}
                    className="w-full h-32 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  />
                  {config.useAI && (
                    <P className="text-xs text-muted-foreground">
                      {t('generator.aiConfig.aiOptimizationNote')}
                    </P>
                  )}
                </Div>
              </CardContent>
            </Card>

            {/* Design Configuration */}
            <Card variant="elevated">
              <CardHeader>
                <H3>{t('generator.design.title')}</H3>
              </CardHeader>
              <CardContent className="space-y-4">
                <TemplateSelector
                  selected={config.template}
                  onSelect={template => updateConfig({ template })}
                />

                <Div className="space-y-2">
                  <Label htmlFor="cv-color">{t('generator.design.colorLabel')}</Label>
                  <Div className="flex gap-2">
                    <input
                      id="cv-color"
                      type="color"
                      value={config.primaryColor}
                      onChange={e => updateConfig({ primaryColor: e.target.value })}
                      className="h-10 w-20 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={config.primaryColor}
                      onChange={e => updateConfig({ primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </Div>
                </Div>
              </CardContent>
            </Card>

            <Button onClick={handleReset} variant="outline" className="w-full">
              {t('generator.resetButton')}
            </Button>
          </Div>

          {/* Preview Panel */}
          <Card variant="elevated" className="lg:sticky lg:top-6 h-fit">
            <CardHeader>
              <H3>{t('generator.preview.title')}</H3>
            </CardHeader>
            <CardContent>
              <CVPreview data={data} config={config} />
            </CardContent>
          </Card>
        </Div>
      </Section>

      {/* Features Section */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>{t('features.title')}</H3>
          <P className="text-muted-foreground mb-6">{t('features.description')}</P>
          <Div className="grid md:grid-cols-3 gap-4">
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Sparkles" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('features.aiOptimization.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('features.aiOptimization.description')}
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Palette" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('features.templates.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('features.templates.description')}
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Download" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('features.export.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('features.export.description')}
                </P>
              </CardContent>
            </Card>
          </Div>
        </Div>
      </Section>
    </>
  )
}

export default function CVGeneratorPage() {
  const t = useSafeTranslations('auth')

  return (
    <RequireAuth
      loadingComponent={
        <Section size="full">
          <Spinner size="lg" />
        </Section>
      }
      fallbackComponent={
        <Section size="full">
          <Card variant={'ghost'}>
            <AccessDenied>
              <LoginButton>{t('login')}</LoginButton>
            </AccessDenied>
          </Card>
        </Section>
      }
    >
      <RequireRole
        roles="superadmin"
        fallbackComponent={
          <Section size={'full'}>
            <Card variant={'ghost'}>
              <InsufficientPermissions requiredRoles="superadmin" />
            </Card>
          </Section>
        }
      >
        <CVGeneratorContent />
      </RequireRole>
    </RequireAuth>
  )
}
