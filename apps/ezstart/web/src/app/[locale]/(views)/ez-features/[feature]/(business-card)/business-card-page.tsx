'use client'

import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { RequireAuth, AccessDenied, LoginButton } from '@ezstart/auth-sdk'
import { RequireRole, InsufficientPermissions } from '@ezstart/rbac'
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
  Spinner,
} from '@ezstart/ui/components'
import { useState } from 'react'
import { BusinessCardCanvas } from './components/business-card-canvas'
import { TemplateSelector } from './components/template-selector'
import { BusinessCardConfig, BusinessCardData } from './types'

const DEFAULT_DATA: BusinessCardData = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  whatsapp: '',
  website: '',
  address: '',
}

const DEFAULT_CONFIG: BusinessCardConfig = {
  template: 'classic',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  includeQR: true,
  qrData: 'vcard',
}

function BusinessCardGeneratorContent() {
  const t = useSafeTranslations('businessCard')
  const [data, setData] = useState<BusinessCardData>(DEFAULT_DATA)
  const [config, setConfig] = useState<BusinessCardConfig>(DEFAULT_CONFIG)

  const handleReset = () => {
    setData(DEFAULT_DATA)
    setConfig(DEFAULT_CONFIG)
  }

  const updateData = (updates: Partial<BusinessCardData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const updateConfig = (updates: Partial<BusinessCardConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:CreditCard" className="w-16 h-16 text-primary mb-4" />
          <H1>{t('hero.title')}</H1>
          <P size="lg" className="text-muted-foreground max-w-2xl">
            {t('hero.description')}
          </P>
        </Div>
      </Section>

      {/* Generator Section */}
      <Section size="default">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <div className="space-y-6">
            <Card variant="elevated">
              <CardHeader>
                <H3>{t('generator.contactInfo.title')}</H3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="card-name">{t('generator.contactInfo.nameLabel')} *</Label>
                  <Input
                    id="card-name"
                    placeholder={t('generator.contactInfo.namePlaceholder')}
                    value={data.name}
                    onChange={e => updateData({ name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-title">{t('generator.contactInfo.titleLabel')}</Label>
                  <Input
                    id="card-title"
                    placeholder={t('generator.contactInfo.titlePlaceholder')}
                    value={data.title}
                    onChange={e => updateData({ title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-company">{t('generator.contactInfo.companyLabel')}</Label>
                  <Input
                    id="card-company"
                    placeholder={t('generator.contactInfo.companyPlaceholder')}
                    value={data.company}
                    onChange={e => updateData({ company: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-email">{t('generator.contactInfo.emailLabel')}</Label>
                    <Input
                      id="card-email"
                      type="email"
                      placeholder={t('generator.contactInfo.emailPlaceholder')}
                      value={data.email}
                      onChange={e => updateData({ email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card-phone">{t('generator.contactInfo.phoneLabel')}</Label>
                    <Input
                      id="card-phone"
                      type="tel"
                      placeholder={t('generator.contactInfo.phonePlaceholder')}
                      value={data.phone}
                      onChange={e => updateData({ phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-whatsapp">
                      {t('generator.contactInfo.whatsappLabel')}
                    </Label>
                    <Input
                      id="card-whatsapp"
                      type="tel"
                      placeholder={t('generator.contactInfo.whatsappPlaceholder')}
                      value={data.whatsapp}
                      onChange={e => updateData({ whatsapp: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card-website">{t('generator.contactInfo.websiteLabel')}</Label>
                    <Input
                      id="card-website"
                      type="url"
                      placeholder={t('generator.contactInfo.websitePlaceholder')}
                      value={data.website}
                      onChange={e => updateData({ website: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="card-address">{t('generator.contactInfo.addressLabel')}</Label>
                  <Input
                    id="card-address"
                    placeholder={t('generator.contactInfo.addressPlaceholder')}
                    value={data.address}
                    onChange={e => updateData({ address: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated">
              <CardHeader>
                <H3>{t('generator.design.title')}</H3>
              </CardHeader>
              <CardContent className="space-y-4">
                <TemplateSelector
                  selected={config.template}
                  onSelect={template => updateConfig({ template })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">{t('generator.design.primaryColorLabel')}</Label>
                    <div className="flex gap-2">
                      <input
                        id="primary-color"
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
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">
                      {t('generator.design.secondaryColorLabel')}
                    </Label>
                    <div className="flex gap-2">
                      <input
                        id="secondary-color"
                        type="color"
                        value={config.secondaryColor}
                        onChange={e => updateConfig({ secondaryColor: e.target.value })}
                        className="h-10 w-20 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={config.secondaryColor}
                        onChange={e => updateConfig({ secondaryColor: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qr-data">{t('generator.design.qrContentLabel')}</Label>
                  <select
                    id="qr-data"
                    value={config.qrData}
                    onChange={e =>
                      updateConfig({ qrData: e.target.value as BusinessCardConfig['qrData'] })
                    }
                    className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="vcard">{t('generator.design.qrContent.vcard')}</option>
                    <option value="website">{t('generator.design.qrContent.website')}</option>
                    <option value="whatsapp">{t('generator.design.qrContent.whatsapp')}</option>
                    <option value="email">{t('generator.design.qrContent.email')}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="include-qr"
                    type="checkbox"
                    checked={config.includeQR}
                    onChange={e => updateConfig({ includeQR: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="include-qr" className="cursor-pointer">
                    {t('generator.design.includeQrLabel')}
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleReset} variant="outline" className="w-full">
              {t('generator.resetButton')}
            </Button>
          </div>

          {/* Preview Panel */}
          <Card variant="elevated" className="lg:sticky lg:top-6 h-fit">
            <CardHeader>
              <H3>{t('generator.preview.title')}</H3>
            </CardHeader>
            <CardContent>
              <BusinessCardCanvas data={data} config={config} />
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Features Section */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>{t('features.title')}</H3>
          <P className="text-muted-foreground mb-6">{t('features.description')}</P>
          <div className="grid md:grid-cols-3 gap-4">
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Zap" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('features.instantSharing.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('features.instantSharing.description')}
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Palette" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('features.customDesign.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('features.customDesign.description')}
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Printer" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('features.printReady.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('features.printReady.description')}
                </P>
              </CardContent>
            </Card>
          </div>
        </Div>
      </Section>
    </>
  )
}

export default function BusinessCardGeneratorPage() {
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
        <BusinessCardGeneratorContent />
      </RequireRole>
    </RequireAuth>
  )
}
