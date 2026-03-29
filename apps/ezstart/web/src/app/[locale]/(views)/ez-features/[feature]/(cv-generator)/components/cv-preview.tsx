'use client'

import { logger } from '@ezstart/logger'
import { Button, Div, Icon, P, Span } from '@ezstart/ui/components'
import { useTranslations } from 'next-intl'
import { useRef } from 'react'
import { toast } from 'sonner'
import { CVConfig, CVData } from '../types'

interface CVPreviewProps {
  data: CVData
  config: CVConfig
}

export function CVPreview({ data, config }: CVPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)
  const t = useTranslations('cvGenerator.generator.preview')

  const handleDownloadPDF = async () => {
    if (!previewRef.current || !data.personalInfo.name) return

    try {
      // Use html2canvas and jsPDF for PDF generation
      const html2canvas = (await import('html2canvas')).default
      const { default: jsPDF } = await import('jspdf')

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`cv-${data.personalInfo.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
    } catch (error) {
      logger.error('PDF generation error:', error)
      toast.error(t('pdfError'))
    }
  }

  if (!data.personalInfo.name) {
    return (
      <Div layout="center" className="min-h-[400px] bg-muted/50 rounded-lg">
        <P className="text-muted-foreground">{t('enterInfo')}</P>
      </Div>
    )
  }

  return (
    <Div className="space-y-4">
      {/* Preview Container - bg-white/text-black is intentional for print context */}
      <Div className="bg-white p-8 rounded-lg shadow-lg overflow-auto max-h-[800px]">
        <Div ref={previewRef} className="text-black" style={{ minHeight: '1122px' }}>
          {/* Header Section */}
          <Div className="border-b-4 pb-6 mb-6" style={{ borderColor: config.primaryColor }}>
            <h1 className="text-4xl font-bold mb-2">{data.personalInfo.name}</h1>
            <h2 className="text-2xl" style={{ color: config.primaryColor }}>
              {data.personalInfo.title}
            </h2>
            <Div className="flex flex-wrap gap-4 mt-4 text-sm">
              {data.personalInfo.email && (
                <Span className="flex items-center gap-1">
                  <Icon name="lucide:Mail" size={14} /> {data.personalInfo.email}
                </Span>
              )}
              {data.personalInfo.phone && (
                <Span className="flex items-center gap-1">
                  <Icon name="lucide:Phone" size={14} /> {data.personalInfo.phone}
                </Span>
              )}
              {data.personalInfo.location && (
                <Span className="flex items-center gap-1">
                  <Icon name="lucide:MapPin" size={14} /> {data.personalInfo.location}
                </Span>
              )}
              {data.personalInfo.github && (
                <Span className="flex items-center gap-1">
                  <Icon name="lucide:Github" size={14} /> {data.personalInfo.github}
                </Span>
              )}
              {data.personalInfo.linkedIn && (
                <Span className="flex items-center gap-1">
                  <Icon name="lucide:Linkedin" size={14} /> {data.personalInfo.linkedIn}
                </Span>
              )}
            </Div>
          </Div>

          {/* Professional Summary */}
          {data.summary && (
            <Div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                {t('professionalSummary')}
              </h3>
              <P className="text-sm leading-relaxed">{data.summary}</P>
            </Div>
          )}

          {/* Experience */}
          {data.experience.length > 0 && (
            <Div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                {t('experience')}
              </h3>
              {data.experience.map((exp, index) => (
                <Div key={index} className="mb-4">
                  <Div className="flex justify-between items-start">
                    <Div>
                      <h4 className="font-bold text-base">{exp.position}</h4>
                      <P className="text-sm" style={{ color: config.primaryColor }}>
                        {exp.company}
                      </P>
                    </Div>
                    <Span className="text-sm text-gray-600">
                      {exp.startDate} - {exp.current ? t('present') : exp.endDate}
                    </Span>
                  </Div>
                  {exp.description.length > 0 && (
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      {exp.description.map((desc, i) => (
                        <li key={i}>{desc}</li>
                      ))}
                    </ul>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <Div className="mt-2 flex flex-wrap gap-2">
                      {exp.technologies.map((tech, i) => (
                        <Span
                          key={i}
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${config.primaryColor}20`,
                            color: config.primaryColor,
                          }}
                        >
                          {tech}
                        </Span>
                      ))}
                    </Div>
                  )}
                </Div>
              ))}
            </Div>
          )}

          {/* Education */}
          {data.education.length > 0 && (
            <Div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                {t('education')}
              </h3>
              {data.education.map((edu, index) => (
                <Div key={index} className="mb-3">
                  <Div className="flex justify-between items-start">
                    <Div>
                      <h4 className="font-bold text-base">
                        {edu.degree} in {edu.field}
                      </h4>
                      <P className="text-sm" style={{ color: config.primaryColor }}>
                        {edu.institution}
                      </P>
                    </Div>
                    <Span className="text-sm text-gray-600">
                      {edu.startDate} - {edu.endDate}
                    </Span>
                  </Div>
                  {edu.gpa && <P className="text-sm mt-1">GPA: {edu.gpa}</P>}
                </Div>
              ))}
            </Div>
          )}

          {/* Skills */}
          {data.skills.length > 0 && (
            <Div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                {t('skills')}
              </h3>
              {data.skills.map((skillSet, index) => (
                <Div key={index} className="mb-2">
                  <Span className="font-semibold text-sm">{skillSet.category}: </Span>
                  <Span className="text-sm">{skillSet.skills.join(', ')}</Span>
                </Div>
              ))}
            </Div>
          )}

          {/* Certifications */}
          {data.certifications.length > 0 && (
            <Div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                {t('certifications')}
              </h3>
              {data.certifications.map((cert, index) => (
                <Div key={index} className="mb-2">
                  <h4 className="font-semibold text-sm">{cert.name}</h4>
                  <P className="text-sm text-gray-600">
                    {cert.issuer} • {cert.date}
                  </P>
                </Div>
              ))}
            </Div>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <Div>
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                {t('languages')}
              </h3>
              <Div className="flex flex-wrap gap-4">
                {data.languages.map((lang, index) => (
                  <Div key={index} className="text-sm">
                    <Span className="font-semibold">{lang.name}</Span> - {lang.proficiency}
                  </Div>
                ))}
              </Div>
            </Div>
          )}
        </Div>
      </Div>

      {/* Download Options */}
      <Div className="space-y-2">
        <P className="text-sm font-medium">{t('export')}</P>
        <Div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadPDF} variant="default" size="sm">
            <Icon name="lucide:Download" size={16} ariaHidden />
            <Span className="ml-2">{t('downloadPdf')}</Span>
          </Button>
        </Div>
        <P className="text-xs text-muted-foreground">{t('atsNote')}</P>
      </Div>
    </Div>
  )
}
