'use client';

import { Button, Card, CardContent, CardHeader, Div, H2, H3, Icon, Input, Label, Section } from '@ezstart/ui/components';
import { useState } from 'react';
import { CVPreview } from './components/cv-preview';
import { TemplateSelector } from './components/template-selector';
import { CVConfig, CVData } from './types';

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
};

const DEFAULT_CONFIG: CVConfig = {
  template: 'professional',
  primaryColor: '#2563eb',
  useAI: false,
  aiSources: {
    githubUsername: '',
    linkedInProfile: '',
    additionalContext: '',
  },
};

export default function CVGeneratorPage() {
  const [data, setData] = useState<CVData>(DEFAULT_DATA);
  const [config, setConfig] = useState<CVConfig>(DEFAULT_CONFIG);
  const [jobPosting, setJobPosting] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleReset = () => {
    setData(DEFAULT_DATA);
    setConfig(DEFAULT_CONFIG);
    setJobPosting('');
  };

  const updateData = (updates: Partial<CVData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const updateConfig = (updates: Partial<CVConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleAIGenerate = async () => {
    if (!jobPosting) {
      alert('Please paste the job posting first');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobPosting,
          currentData: data,
          sources: config.aiSources,
        }),
      });

      if (!response.ok) throw new Error('Generation failed');

      const generatedData = await response.json();
      setData(generatedData);
    } catch (error) {
      console.error('AI generation error:', error);
      alert('Failed to generate CV. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Section className='space-y-6'>
      <Div>
        <H2>AI-Powered CV Generator</H2>
        <p className='text-muted-foreground mt-2'>
          Generate optimized CVs tailored to job postings using AI
        </p>
      </Div>

      <div className='grid lg:grid-cols-2 gap-6'>
        {/* Configuration Panel */}
        <div className='space-y-6'>
          {/* AI Configuration */}
          <Card variant='elevated'>
            <CardHeader>
              <H3>AI Configuration</H3>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center gap-2'>
                <input
                  id='use-ai'
                  type='checkbox'
                  checked={config.useAI}
                  onChange={(e) => updateConfig({ useAI: e.target.checked })}
                  className='h-4 w-4'
                />
                <Label htmlFor='use-ai' className='cursor-pointer'>
                  Use AI to optimize CV
                </Label>
              </div>

              {config.useAI && (
                <>
                  <div className='space-y-2'>
                    <Label htmlFor='job-posting'>Job Posting *</Label>
                    <textarea
                      id='job-posting'
                      placeholder='Paste the job posting here...'
                      value={jobPosting}
                      onChange={(e) => setJobPosting(e.target.value)}
                      className='w-full h-32 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y'
                      required={config.useAI}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='github-username'>GitHub Username</Label>
                    <Input
                      id='github-username'
                      placeholder='yourusername'
                      value={config.aiSources.githubUsername}
                      onChange={(e) =>
                        updateConfig({
                          aiSources: { ...config.aiSources, githubUsername: e.target.value },
                        })
                      }
                    />
                    <p className='text-xs text-muted-foreground'>
                      AI will analyze your repositories and contributions
                    </p>
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='linkedin-profile'>LinkedIn Profile URL</Label>
                    <Input
                      id='linkedin-profile'
                      type='url'
                      placeholder='https://linkedin.com/in/yourprofile'
                      value={config.aiSources.linkedInProfile}
                      onChange={(e) =>
                        updateConfig({
                          aiSources: { ...config.aiSources, linkedInProfile: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='additional-context'>Additional Context</Label>
                    <textarea
                      id='additional-context'
                      placeholder='Add any additional information to help AI optimize your CV...'
                      value={config.aiSources.additionalContext}
                      onChange={(e) =>
                        updateConfig({
                          aiSources: { ...config.aiSources, additionalContext: e.target.value },
                        })
                      }
                      className='w-full h-24 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y'
                    />
                  </div>

                  <Button
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !jobPosting}
                    className='w-full'
                  >
                    {isGenerating ? (
                      <>
                        <Icon name='lucide:Loader2' size={16} spin ariaHidden />
                        <span className='ml-2'>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Icon name='lucide:Sparkles' size={16} ariaHidden />
                        <span className='ml-2'>Generate with AI</span>
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Personal Info */}
          <Card variant='elevated'>
            <CardHeader>
              <H3>Personal Information</H3>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='cv-name'>Full Name *</Label>
                <Input
                  id='cv-name'
                  placeholder='John Doe'
                  value={data.personalInfo.name}
                  onChange={(e) =>
                    updateData({
                      personalInfo: { ...data.personalInfo, name: e.target.value },
                    })
                  }
                  required
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='cv-title'>Professional Title *</Label>
                <Input
                  id='cv-title'
                  placeholder='Senior Software Engineer'
                  value={data.personalInfo.title}
                  onChange={(e) =>
                    updateData({
                      personalInfo: { ...data.personalInfo, title: e.target.value },
                    })
                  }
                  required
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='cv-email'>Email</Label>
                  <Input
                    id='cv-email'
                    type='email'
                    placeholder='john@example.com'
                    value={data.personalInfo.email}
                    onChange={(e) =>
                      updateData({
                        personalInfo: { ...data.personalInfo, email: e.target.value },
                      })
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='cv-phone'>Phone</Label>
                  <Input
                    id='cv-phone'
                    type='tel'
                    placeholder='+1 234 567 8900'
                    value={data.personalInfo.phone}
                    onChange={(e) =>
                      updateData({
                        personalInfo: { ...data.personalInfo, phone: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <Label htmlFor='cv-location'>Location</Label>
                <Input
                  id='cv-location'
                  placeholder='City, Country'
                  value={data.personalInfo.location}
                  onChange={(e) =>
                    updateData({
                      personalInfo: { ...data.personalInfo, location: e.target.value },
                    })
                  }
                />
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='cv-github'>GitHub</Label>
                  <Input
                    id='cv-github'
                    placeholder='github.com/username'
                    value={data.personalInfo.github}
                    onChange={(e) =>
                      updateData({
                        personalInfo: { ...data.personalInfo, github: e.target.value },
                      })
                    }
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='cv-linkedin'>LinkedIn</Label>
                  <Input
                    id='cv-linkedin'
                    placeholder='linkedin.com/in/username'
                    value={data.personalInfo.linkedIn}
                    onChange={(e) =>
                      updateData({
                        personalInfo: { ...data.personalInfo, linkedIn: e.target.value },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Professional Summary */}
          <Card variant='elevated'>
            <CardHeader>
              <H3>Professional Summary</H3>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <Label htmlFor='cv-summary'>Summary</Label>
                <textarea
                  id='cv-summary'
                  placeholder='Write a compelling professional summary...'
                  value={data.summary}
                  onChange={(e) => updateData({ summary: e.target.value })}
                  className='w-full h-32 px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y'
                />
                {config.useAI && (
                  <p className='text-xs text-muted-foreground'>
                    💡 AI will optimize this based on the job posting
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Design Configuration */}
          <Card variant='elevated'>
            <CardHeader>
              <H3>Design Template</H3>
            </CardHeader>
            <CardContent className='space-y-4'>
              <TemplateSelector
                selected={config.template}
                onSelect={(template) => updateConfig({ template })}
              />

              <div className='space-y-2'>
                <Label htmlFor='cv-color'>Accent Color</Label>
                <div className='flex gap-2'>
                  <input
                    id='cv-color'
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
            </CardContent>
          </Card>

          <Button onClick={handleReset} variant='outline' className='w-full'>
            Reset All
          </Button>
        </div>

        {/* Preview Panel */}
        <Card variant='elevated' className='lg:sticky lg:top-6 h-fit'>
          <CardHeader>
            <H3>Preview & Download</H3>
          </CardHeader>
          <CardContent>
            <CVPreview data={data} config={config} />
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}
