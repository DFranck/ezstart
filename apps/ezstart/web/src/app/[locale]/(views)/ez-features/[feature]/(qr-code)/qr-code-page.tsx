'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Div,
  H1,
  H3,
  Icon,
  Input,
  Label,
  P,
  Section,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
} from '@ezstart/ui/components'
import { RequireAuth, AccessDenied, LoginButton } from '@ezstart/auth-sdk'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { useState } from 'react'
import { QRCodeCanvas } from './components/qrcode-canvas'
import { QRCodeConfig } from './types'

const DEFAULT_CONFIG: QRCodeConfig = {
  url: '',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  size: 256,
  errorCorrectionLevel: 'M',
  includeMargin: true,
  redirectType: 'permanent',
}

function QRCodeGeneratorContent() {
  const t = useSafeTranslations('qrCode')
  const [config, setConfig] = useState<QRCodeConfig>(DEFAULT_CONFIG)

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
  }

  const updateConfig = (updates: Partial<QRCodeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:QrCode" className="w-16 h-16 text-primary mb-4" />
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
          <Card variant="elevated">
            <CardHeader>
              <H3>{t('generator.configuration.title')}</H3>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Input */}
              <Div className="space-y-2">
                <Label htmlFor="qr-url">{t('generator.configuration.urlLabel')} *</Label>
                <Input
                  id="qr-url"
                  type="url"
                  placeholder={t('generator.configuration.urlPlaceholder')}
                  value={config.url}
                  onChange={e => updateConfig({ url: e.target.value })}
                  required
                />
              </Div>

              {/* Redirect Type */}
              <Div className="space-y-2">
                <Label htmlFor="redirect-type">
                  {t('generator.configuration.redirectTypeLabel')}
                </Label>
                <Select
                  value={config.redirectType}
                  onValueChange={value =>
                    updateConfig({ redirectType: value as 'permanent' | 'temporary' })
                  }
                >
                  <SelectTrigger id="redirect-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">
                      {t('generator.configuration.redirectType.permanent')}
                    </SelectItem>
                    <SelectItem value="temporary">
                      {t('generator.configuration.redirectType.temporary')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </Div>

              {/* Size Control */}
              <Div className="space-y-2">
                <Label htmlFor="qr-size">
                  {t('generator.configuration.sizeLabel')}: {config.size}px
                </Label>
                <Input
                  id="qr-size"
                  type="range"
                  value={config.size}
                  onChange={e => updateConfig({ size: Number(e.target.value) })}
                  min={128}
                  max={512}
                  step={32}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </Div>

              {/* Color Controls */}
              <Div className="grid grid-cols-2 gap-4">
                <Div className="space-y-2">
                  <Label htmlFor="fg-color">
                    {t('generator.configuration.foregroundColorLabel')}
                  </Label>
                  <Div className="flex gap-2">
                    <Input
                      id="fg-color"
                      type="color"
                      value={config.foregroundColor}
                      onChange={e => updateConfig({ foregroundColor: e.target.value })}
                      className="h-10 w-20 cursor-pointer p-1"
                    />
                    <Input
                      type="text"
                      value={config.foregroundColor}
                      onChange={e => updateConfig({ foregroundColor: e.target.value })}
                      className="flex-1"
                    />
                  </Div>
                </Div>

                <Div className="space-y-2">
                  <Label htmlFor="bg-color">
                    {t('generator.configuration.backgroundColorLabel')}
                  </Label>
                  <Div className="flex gap-2">
                    <Input
                      id="bg-color"
                      type="color"
                      value={config.backgroundColor}
                      onChange={e => updateConfig({ backgroundColor: e.target.value })}
                      className="h-10 w-20 cursor-pointer p-1"
                    />
                    <Input
                      type="text"
                      value={config.backgroundColor}
                      onChange={e => updateConfig({ backgroundColor: e.target.value })}
                      className="flex-1"
                    />
                  </Div>
                </Div>
              </Div>

              {/* Error Correction Level */}
              <Div className="space-y-2">
                <Label htmlFor="error-correction">
                  {t('generator.configuration.errorCorrectionLabel')}
                </Label>
                <Select
                  value={config.errorCorrectionLevel}
                  onValueChange={value =>
                    updateConfig({
                      errorCorrectionLevel: value as QRCodeConfig['errorCorrectionLevel'],
                    })
                  }
                >
                  <SelectTrigger id="error-correction" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">
                      {t('generator.configuration.errorCorrection.low')}
                    </SelectItem>
                    <SelectItem value="M">
                      {t('generator.configuration.errorCorrection.medium')}
                    </SelectItem>
                    <SelectItem value="Q">
                      {t('generator.configuration.errorCorrection.quartile')}
                    </SelectItem>
                    <SelectItem value="H">
                      {t('generator.configuration.errorCorrection.high')}
                    </SelectItem>
                  </SelectContent>
                </Select>
                <P className="text-sm text-muted-foreground">
                  {t('generator.configuration.errorCorrectionHelp')}
                </P>
              </Div>

              {/* Include Margin */}
              <Div className="flex items-center gap-2">
                <Checkbox
                  id="include-margin"
                  checked={config.includeMargin}
                  onCheckedChange={checked => updateConfig({ includeMargin: checked === true })}
                />
                <Label htmlFor="include-margin" className="cursor-pointer">
                  {t('generator.configuration.includeMarginLabel')}
                </Label>
              </Div>

              {/* Actions */}
              <Div className="flex gap-2 pt-4">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  {t('generator.configuration.resetButton')}
                </Button>
              </Div>
            </CardContent>
          </Card>

          {/* Preview Panel */}
          <Card variant="elevated">
            <CardHeader>
              <H3>{t('generator.preview.title')}</H3>
            </CardHeader>
            <CardContent>
              <QRCodeCanvas config={config} />
            </CardContent>
          </Card>
        </Div>
      </Section>

      {/* Use Cases Section */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>{t('useCases.title')}</H3>
          <P className="text-muted-foreground mb-6">{t('useCases.description')}</P>
          <Div className="grid md:grid-cols-3 gap-4">
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Briefcase" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('useCases.businessCards.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('useCases.businessCards.description')}
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Share2" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('useCases.marketing.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('useCases.marketing.description')}
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Ticket" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">{t('useCases.events.title')}</P>
                <P size="sm" className="text-muted-foreground">
                  {t('useCases.events.description')}
                </P>
              </CardContent>
            </Card>
          </Div>
        </Div>
      </Section>
    </>
  )
}

export default function QRCodeGeneratorPage() {
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
      <QRCodeGeneratorContent />
    </RequireAuth>
  )
}
