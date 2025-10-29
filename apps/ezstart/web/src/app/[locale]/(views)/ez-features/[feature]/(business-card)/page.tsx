'use client';

import { Button, Card, CardContent, CardHeader, Div, H2, H3, Input, Label, Section } from '@ezstart/ui/components';
import { useState } from 'react';
import { BusinessCardCanvas } from './components/business-card-canvas';
import { TemplateSelector } from './components/template-selector';
import { BusinessCardConfig, BusinessCardData } from './types';

const DEFAULT_DATA: BusinessCardData = {
  name: '',
  title: '',
  company: '',
  email: '',
  phone: '',
  whatsapp: '',
  website: '',
  address: '',
};

const DEFAULT_CONFIG: BusinessCardConfig = {
  template: 'classic',
  primaryColor: '#3b82f6',
  secondaryColor: '#1e40af',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  includeQR: true,
  qrData: 'vcard',
};

export default function BusinessCardGeneratorPage() {
  const [data, setData] = useState<BusinessCardData>(DEFAULT_DATA);
  const [config, setConfig] = useState<BusinessCardConfig>(DEFAULT_CONFIG);

  const handleReset = () => {
    setData(DEFAULT_DATA);
    setConfig(DEFAULT_CONFIG);
  };

  const updateData = (updates: Partial<BusinessCardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const updateConfig = (updates: Partial<BusinessCardConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <Section className='space-y-6'>
      <Div>
        <H2>Business Card Generator</H2>
        <p className='text-muted-foreground mt-2'>
          Create professional printable business cards with QR codes
        </p>
      </Div>

      <div className='grid lg:grid-cols-2 gap-6'>
        {/* Configuration Panel */}
        <div className='space-y-6'>
          <Card variant='elevated'>
            <CardHeader>
              <H3>Contact Information</H3>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='card-name'>Full Name *</Label>
                <Input
                  id='card-name'
                  placeholder='John Doe'
                  value={data.name}
                  onChange={(e) => updateData({ name: e.target.value })}
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='card-title'>Job Title</Label>
                <Input
                  id='card-title'
                  placeholder='Software Engineer'
                  value={data.title}
                  onChange={(e) => updateData({ title: e.target.value })}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='card-company'>Company</Label>
                <Input
                  id='card-company'
                  placeholder='ACME Inc.'
                  value={data.company}
                  onChange={(e) => updateData({ company: e.target.value })}
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='card-email'>Email</Label>
                  <Input
                    id='card-email'
                    type='email'
                    placeholder='john@example.com'
                    value={data.email}
                    onChange={(e) => updateData({ email: e.target.value })}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='card-phone'>Phone</Label>
                  <Input
                    id='card-phone'
                    type='tel'
                    placeholder='+1 234 567 8900'
                    value={data.phone}
                    onChange={(e) => updateData({ phone: e.target.value })}
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='card-whatsapp'>WhatsApp</Label>
                  <Input
                    id='card-whatsapp'
                    type='tel'
                    placeholder='+1 234 567 8900'
                    value={data.whatsapp}
                    onChange={(e) => updateData({ whatsapp: e.target.value })}
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='card-website'>Website</Label>
                  <Input
                    id='card-website'
                    type='url'
                    placeholder='https://example.com'
                    value={data.website}
                    onChange={(e) => updateData({ website: e.target.value })}
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='card-address'>Address</Label>
                <Input
                  id='card-address'
                  placeholder='123 Main St, City, Country'
                  value={data.address}
                  onChange={(e) => updateData({ address: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card variant='elevated'>
            <CardHeader>
              <H3>Design Configuration</H3>
            </CardHeader>
            <CardContent className='space-y-4'>
              <TemplateSelector
                selected={config.template}
                onSelect={(template) => updateConfig({ template })}
              />

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='primary-color'>Primary Color</Label>
                  <div className='flex gap-2'>
                    <input
                      id='primary-color'
                      type='color'
                      value={config.primaryColor}
                      onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                      className='h-10 w-20 cursor-pointer'
                    />
                    <Input
                      type='text'
                      value={config.primaryColor}
                      onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                      className='flex-1'
                    />
                  </div>
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='secondary-color'>Secondary Color</Label>
                  <div className='flex gap-2'>
                    <input
                      id='secondary-color'
                      type='color'
                      value={config.secondaryColor}
                      onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
                      className='h-10 w-20 cursor-pointer'
                    />
                    <Input
                      type='text'
                      value={config.secondaryColor}
                      onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
                      className='flex-1'
                    />
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='qr-data'>QR Code Content</Label>
                <select
                  id='qr-data'
                  value={config.qrData}
                  onChange={(e) => updateConfig({ qrData: e.target.value as BusinessCardConfig['qrData'] })}
                  className='w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
                >
                  <option value='vcard'>vCard (Contact Info)</option>
                  <option value='website'>Website URL</option>
                  <option value='whatsapp'>WhatsApp</option>
                  <option value='email'>Email</option>
                </select>
              </div>

              <div className='flex items-center gap-2'>
                <input
                  id='include-qr'
                  type='checkbox'
                  checked={config.includeQR}
                  onChange={(e) => updateConfig({ includeQR: e.target.checked })}
                  className='h-4 w-4'
                />
                <Label htmlFor='include-qr' className='cursor-pointer'>
                  Include QR Code
                </Label>
              </div>
            </CardContent>
          </Card>

          <Button onClick={handleReset} variant='outline' className='w-full'>
            Reset All
          </Button>
        </div>

        {/* Preview Panel */}
        <Card variant='elevated' className='lg:sticky lg:top-6 h-fit'>
          <CardHeader>
            <H3>Preview & Export</H3>
          </CardHeader>
          <CardContent>
            <BusinessCardCanvas data={data} config={config} />
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
