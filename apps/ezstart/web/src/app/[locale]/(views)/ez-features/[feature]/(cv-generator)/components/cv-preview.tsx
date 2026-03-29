'use client'

import { logger } from '@ezstart/logger'
import { Button, Div, Icon } from '@ezstart/ui/components'
import { useRef } from 'react'
import { toast } from 'sonner'
import { CVConfig, CVData } from '../types'

interface CVPreviewProps {
  data: CVData
  config: CVConfig
}

export function CVPreview({ data, config }: CVPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

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
      toast.error('Failed to generate PDF. Please try again.')
    }
  }

  if (!data.personalInfo.name) {
    return (
      <Div layout="center" className="min-h-[400px] bg-muted/50 rounded-lg">
        <p className="text-muted-foreground">Enter your information to preview CV</p>
      </Div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Preview Container */}
      <Div className="bg-white p-8 rounded-lg shadow-lg overflow-auto max-h-[800px]">
        <div ref={previewRef} className="text-black" style={{ minHeight: '1122px' }}>
          {/* Header Section */}
          <div className="border-b-4 pb-6 mb-6" style={{ borderColor: config.primaryColor }}>
            <h1 className="text-4xl font-bold mb-2">{data.personalInfo.name}</h1>
            <h2 className="text-2xl" style={{ color: config.primaryColor }}>
              {data.personalInfo.title}
            </h2>
            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              {data.personalInfo.email && (
                <span className="flex items-center gap-1">
                  <Icon name="lucide:Mail" size={14} /> {data.personalInfo.email}
                </span>
              )}
              {data.personalInfo.phone && (
                <span className="flex items-center gap-1">
                  <Icon name="lucide:Phone" size={14} /> {data.personalInfo.phone}
                </span>
              )}
              {data.personalInfo.location && (
                <span className="flex items-center gap-1">
                  <Icon name="lucide:MapPin" size={14} /> {data.personalInfo.location}
                </span>
              )}
              {data.personalInfo.github && (
                <span className="flex items-center gap-1">
                  <Icon name="lucide:Github" size={14} /> {data.personalInfo.github}
                </span>
              )}
              {data.personalInfo.linkedIn && (
                <span className="flex items-center gap-1">
                  <Icon name="lucide:Linkedin" size={14} /> {data.personalInfo.linkedIn}
                </span>
              )}
            </div>
          </div>

          {/* Professional Summary */}
          {data.summary && (
            <div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                Professional Summary
              </h3>
              <p className="text-sm leading-relaxed">{data.summary}</p>
            </div>
          )}

          {/* Experience */}
          {data.experience.length > 0 && (
            <div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                Experience
              </h3>
              {data.experience.map((exp, index) => (
                <div key={index} className="mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-base">{exp.position}</h4>
                      <p className="text-sm" style={{ color: config.primaryColor }}>
                        {exp.company}
                      </p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  {exp.description.length > 0 && (
                    <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                      {exp.description.map((desc, i) => (
                        <li key={i}>{desc}</li>
                      ))}
                    </ul>
                  )}
                  {exp.technologies && exp.technologies.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {exp.technologies.map((tech, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${config.primaryColor}20`,
                            color: config.primaryColor,
                          }}
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {data.education.length > 0 && (
            <div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                Education
              </h3>
              {data.education.map((edu, index) => (
                <div key={index} className="mb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-base">
                        {edu.degree} in {edu.field}
                      </h4>
                      <p className="text-sm" style={{ color: config.primaryColor }}>
                        {edu.institution}
                      </p>
                    </div>
                    <span className="text-sm text-gray-600">
                      {edu.startDate} - {edu.endDate}
                    </span>
                  </div>
                  {edu.gpa && <p className="text-sm mt-1">GPA: {edu.gpa}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {data.skills.length > 0 && (
            <div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                Skills
              </h3>
              {data.skills.map((skillSet, index) => (
                <div key={index} className="mb-2">
                  <span className="font-semibold text-sm">{skillSet.category}: </span>
                  <span className="text-sm">{skillSet.skills.join(', ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {data.certifications.length > 0 && (
            <div className="mb-6">
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                Certifications
              </h3>
              {data.certifications.map((cert, index) => (
                <div key={index} className="mb-2">
                  <h4 className="font-semibold text-sm">{cert.name}</h4>
                  <p className="text-sm text-gray-600">
                    {cert.issuer} • {cert.date}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <div>
              <h3
                className="text-xl font-bold mb-3 pb-1 border-b-2"
                style={{ borderColor: config.primaryColor }}
              >
                Languages
              </h3>
              <div className="flex flex-wrap gap-4">
                {data.languages.map((lang, index) => (
                  <div key={index} className="text-sm">
                    <span className="font-semibold">{lang.name}</span> - {lang.proficiency}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Div>

      {/* Download Options */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Export</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleDownloadPDF} variant="default" size="sm">
            <Icon name="lucide:Download" size={16} ariaHidden />
            <span className="ml-2">Download PDF</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Standard A4 format optimized for ATS (Applicant Tracking Systems)
        </p>
      </div>
    </div>
  )
}
