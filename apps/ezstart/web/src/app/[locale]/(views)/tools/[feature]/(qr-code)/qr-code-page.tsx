'use client'

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Div,
  H2,
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
} from '@ezstart/ui/components'
import { useAuthStore } from '@ezstart/auth-sdk'
import { useSafeTranslations } from '@/hooks/useSafeIntl'
import { useState } from 'react'
import { QRCodeCanvas } from './components/qrcode-canvas'
import { SavedQRCodes } from './components/saved-qr-codes'
import { useCreateQRCode } from './hooks/useQRCodes'
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
  const [title, setTitle] = useState('')
  const { user, isAuthenticated } = useAuthStore()
  const createMutation = useCreateQRCode(t)

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG)
    setTitle('')
  }

  const updateConfig = (updates: Partial<QRCodeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const handleSave = () => {
    if (!config.url) return

    createMutation.mutate({
      url: config.url,
      title: title || undefined,
      redirectType: config.redirectType,
      size: config.size,
      foreground: config.foregroundColor,
      background: config.backgroundColor,
      errorCorrection: config.errorCorrectionLevel,
      includeMargin: config.includeMargin,
      userEmail: user?.email,
    })
  }

  return (
    <>
      {/* Hero Section - Compact */}
      <Section size="full" className="py-8 border-b border-border">
        <Div layout="center">
          <H2>{t('hero.title')}</H2>
          <P className="text-muted-foreground max-w-xl">{t('hero.description')}</P>
        </Div>
      </Section>

      {/* Generator Section - Preview LEFT, Config RIGHT */}
      <Section size="default" className="py-8">
        <Div className="grid lg:grid-cols-2 gap-8">
          {/* Preview Panel - LEFT */}
          <Card>
            <CardHeader>
              <H3>{t('generator.preview.title')}</H3>
            </CardHeader>
            <CardContent>
              <QRCodeCanvas config={config} />

              {/* Save button - only for authenticated users with a valid URL */}
              {isAuthenticated && config.url && (
                <Div className="mt-4 space-y-3 border-t border-border pt-4">
                  <Div className="space-y-2">
                    <Label htmlFor="qr-title">{t('saved.titleLabel')}</Label>
                    <Input
                      id="qr-title"
                      placeholder={t('saved.titlePlaceholder')}
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      maxLength={200}
                    />
                  </Div>
                  <Button
                    onClick={handleSave}
                    variant="default"
                    className="w-full"
                    disabled={createMutation.isPending}
                  >
                    <Icon name="lucide:Save" size={16} ariaHidden />
                    <P className="ml-2">
                      {createMutation.isPending ? t('saved.saving') : t('saved.saveButton')}
                    </P>
                  </Button>
                </Div>
              )}

              {/* Sign-in prompt for unauthenticated users */}
              {!isAuthenticated && config.url && (
                <Div className="mt-4 border-t border-border pt-3">
                  <P size="sm" className="text-muted-foreground text-center">
                    <Icon name="lucide:Info" size={14} className="inline mr-1" ariaHidden />
                    {t('saved.signInToSave')}
                  </P>
                </Div>
              )}
            </CardContent>
          </Card>

          {/* Configuration Panel - RIGHT */}
          <Card>
            <CardHeader>
              <H3>{t('generator.configuration.title')}</H3>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* URL Input - Prominent */}
              <Div className="space-y-2">
                <Label htmlFor="qr-url">{t('generator.configuration.urlLabel')} *</Label>
                <Input
                  id="qr-url"
                  type="url"
                  placeholder={t('generator.configuration.urlPlaceholder')}
                  value={config.url}
                  onChange={e => updateConfig({ url: e.target.value })}
                  required
                  className="text-base"
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

              {/* Size Control - Value shown inline */}
              <Div className="space-y-2">
                <Div className="flex items-center justify-between">
                  <Label htmlFor="qr-size">{t('generator.configuration.sizeLabel')}</Label>
                  <P size="sm" className="text-muted-foreground">
                    {config.size}px
                  </P>
                </Div>
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

              {/* Color Controls - Compact inline */}
              <Div className="grid grid-cols-2 gap-4">
                <Div className="space-y-2">
                  <Label htmlFor="fg-color">
                    {t('generator.configuration.foregroundColorLabel')}
                  </Label>
                  <Div className="flex items-center gap-2">
                    <Input
                      id="fg-color"
                      type="color"
                      value={config.foregroundColor}
                      onChange={e => updateConfig({ foregroundColor: e.target.value })}
                      className="h-9 w-12 cursor-pointer p-0.5 rounded"
                    />
                    <Input
                      type="text"
                      value={config.foregroundColor}
                      onChange={e => updateConfig({ foregroundColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
                    />
                  </Div>
                </Div>

                <Div className="space-y-2">
                  <Label htmlFor="bg-color">
                    {t('generator.configuration.backgroundColorLabel')}
                  </Label>
                  <Div className="flex items-center gap-2">
                    <Input
                      id="bg-color"
                      type="color"
                      value={config.backgroundColor}
                      onChange={e => updateConfig({ backgroundColor: e.target.value })}
                      className="h-9 w-12 cursor-pointer p-0.5 rounded"
                    />
                    <Input
                      type="text"
                      value={config.backgroundColor}
                      onChange={e => updateConfig({ backgroundColor: e.target.value })}
                      className="flex-1 font-mono text-sm"
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
                <P size="sm" className="text-muted-foreground">
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

              {/* Reset */}
              <Div className="pt-2">
                <Button onClick={handleReset} variant="outline" className="w-full">
                  {t('generator.configuration.resetButton')}
                </Button>
              </Div>
            </CardContent>
          </Card>
        </Div>
      </Section>

      {/* Saved QR Codes Section */}
      <Section size="default" className="py-8">
        <SavedQRCodes />
      </Section>

      {/* Use Cases Section - Subtle */}
      <Section size="narrow" className="py-8">
        <Div layout="center" className="mb-4">
          <H3 className="text-lg">{t('useCases.title')}</H3>
          <P size="sm" className="text-muted-foreground">
            {t('useCases.description')}
          </P>
        </Div>
        <Div className="grid md:grid-cols-3 gap-3">
          <Card variant="outline">
            <CardContent className="text-center py-4 space-y-1">
              <Icon name="lucide:Briefcase" className="w-6 h-6 mx-auto text-primary" />
              <P size="sm" weight="medium">
                {t('useCases.businessCards.title')}
              </P>
              <P size="xs" className="text-muted-foreground">
                {t('useCases.businessCards.description')}
              </P>
            </CardContent>
          </Card>
          <Card variant="outline">
            <CardContent className="text-center py-4 space-y-1">
              <Icon name="lucide:Share2" className="w-6 h-6 mx-auto text-primary" />
              <P size="sm" weight="medium">
                {t('useCases.marketing.title')}
              </P>
              <P size="xs" className="text-muted-foreground">
                {t('useCases.marketing.description')}
              </P>
            </CardContent>
          </Card>
          <Card variant="outline">
            <CardContent className="text-center py-4 space-y-1">
              <Icon name="lucide:Ticket" className="w-6 h-6 mx-auto text-primary" />
              <P size="sm" weight="medium">
                {t('useCases.events.title')}
              </P>
              <P size="xs" className="text-muted-foreground">
                {t('useCases.events.description')}
              </P>
            </CardContent>
          </Card>
        </Div>
      </Section>
    </>
  )
}

export default function QRCodeGeneratorPage() {
  return <QRCodeGeneratorContent />
}
