'use client';

import { Button, Card, CardContent, CardHeader, Div, H1, H3, Icon, Input, Label, P, Section } from '@ezstart/ui/components';
import { useState } from 'react';
import { QRCodeCanvas } from './components/qrcode-canvas';
import { QRCodeConfig } from './types';

const DEFAULT_CONFIG: QRCodeConfig = {
  url: '',
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  size: 256,
  errorCorrectionLevel: 'M',
  includeMargin: true,
  redirectType: 'permanent',
};

export default function QRCodeGeneratorPage() {
  const [config, setConfig] = useState<QRCodeConfig>(DEFAULT_CONFIG);

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  const updateConfig = (updates: Partial<QRCodeConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <>
      {/* Hero Section */}
      <Section size="full" className="bg-gradient-to-b from-primary/5 to-background py-12">
        <Div layout="center">
          <Icon name="lucide:QrCode" className="w-16 h-16 text-primary mb-4" />
          <H1>QR Code Generator</H1>
          <P size="lg" className="text-muted-foreground max-w-2xl">
            Generate professional QR codes with customization options.
            Perfect for business cards, marketing materials, and event tickets.
          </P>
        </Div>
      </Section>

      {/* Generator Section */}
      <Section size="default">

      <div className='grid lg:grid-cols-2 gap-6'>
        {/* Configuration Panel */}
        <Card variant='elevated'>
          <CardHeader>
            <H3>Configuration</H3>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* URL Input */}
            <div className='space-y-2'>
              <Label htmlFor='qr-url'>Target URL *</Label>
              <Input
                id='qr-url'
                type='url'
                placeholder='https://example.com'
                value={config.url}
                onChange={(e) => updateConfig({ url: e.target.value })}
                required
              />
            </div>

            {/* Redirect Type */}
            <div className='space-y-2'>
              <Label htmlFor='redirect-type'>Redirect Type</Label>
              <select
                id='redirect-type'
                value={config.redirectType}
                onChange={(e) => updateConfig({ redirectType: e.target.value as 'permanent' | 'temporary' })}
                className='w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value='permanent'>Permanent (Direct)</option>
                <option value='temporary'>Temporary (Trackable)</option>
              </select>
            </div>

            {/* Size Control */}
            <div className='space-y-2'>
              <Label htmlFor='qr-size'>Size: {config.size}px</Label>
              <input
                id='qr-size'
                type='range'
                value={config.size}
                onChange={(e) => updateConfig({ size: Number(e.target.value) })}
                min={128}
                max={512}
                step={32}
                className='w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary'
              />
            </div>

            {/* Color Controls */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='fg-color'>Foreground Color</Label>
                <div className='flex gap-2'>
                  <input
                    id='fg-color'
                    type='color'
                    value={config.foregroundColor}
                    onChange={(e) => updateConfig({ foregroundColor: e.target.value })}
                    className='h-10 w-20 cursor-pointer'
                  />
                  <Input
                    type='text'
                    value={config.foregroundColor}
                    onChange={(e) => updateConfig({ foregroundColor: e.target.value })}
                    className='flex-1'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='bg-color'>Background Color</Label>
                <div className='flex gap-2'>
                  <input
                    id='bg-color'
                    type='color'
                    value={config.backgroundColor}
                    onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                    className='h-10 w-20 cursor-pointer'
                  />
                  <Input
                    type='text'
                    value={config.backgroundColor}
                    onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                    className='flex-1'
                  />
                </div>
              </div>
            </div>

            {/* Error Correction Level */}
            <div className='space-y-2'>
              <Label htmlFor='error-correction'>Error Correction Level</Label>
              <select
                id='error-correction'
                value={config.errorCorrectionLevel}
                onChange={(e) => updateConfig({ errorCorrectionLevel: e.target.value as QRCodeConfig['errorCorrectionLevel'] })}
                className='w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
              >
                <option value='L'>Low (7%)</option>
                <option value='M'>Medium (15%)</option>
                <option value='Q'>Quartile (25%)</option>
                <option value='H'>High (30%)</option>
              </select>
              <p className='text-sm text-muted-foreground'>
                Higher levels allow better recovery from damage
              </p>
            </div>

            {/* Include Margin */}
            <div className='flex items-center gap-2'>
              <input
                id='include-margin'
                type='checkbox'
                checked={config.includeMargin}
                onChange={(e) => updateConfig({ includeMargin: e.target.checked })}
                className='h-4 w-4'
              />
              <Label htmlFor='include-margin' className='cursor-pointer'>
                Include margin
              </Label>
            </div>

            {/* Actions */}
            <div className='flex gap-2 pt-4'>
              <Button onClick={handleReset} variant='outline' className='flex-1'>
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <Card variant='elevated'>
          <CardHeader>
            <H3>Preview & Download</H3>
          </CardHeader>
          <CardContent>
            <QRCodeCanvas config={config} />
          </CardContent>
        </Card>
      </div>
      </Section>

      {/* Use Cases Section */}
      <Section size="narrow" className="bg-muted/50">
        <Div layout="center">
          <H3>Common Use Cases</H3>
          <P className="text-muted-foreground mb-6">
            QR codes are versatile and can be used in many scenarios
          </P>
          <div className="grid md:grid-cols-3 gap-4">
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Briefcase" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">Business Cards</P>
                <P size="sm" className="text-muted-foreground">
                  Share contact details instantly
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Share2" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">Marketing</P>
                <P size="sm" className="text-muted-foreground">
                  Drive traffic to campaigns
                </P>
              </CardContent>
            </Card>
            <Card variant="outline">
              <CardContent className="text-center py-6 space-y-2">
                <Icon name="lucide:Ticket" className="w-8 h-8 mx-auto text-primary" />
                <P weight="medium">Event Tickets</P>
                <P size="sm" className="text-muted-foreground">
                  Quick and secure entry
                </P>
              </CardContent>
            </Card>
          </div>
        </Div>
      </Section>
    </>
  );
}
