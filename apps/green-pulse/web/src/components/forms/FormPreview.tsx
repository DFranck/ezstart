'use client'

import { Badge, Card, CardContent, Div, H3, Input, Label, P, Span } from '@ezstart/ui/components'
import type { FormConfig } from '@green-pulse/types'

interface FormPreviewProps {
  formConfig: FormConfig
  extractedFields: Record<string, any>
  onFieldsUpdate: (fields: Record<string, any>) => void
  disabled?: boolean
}

export function FormPreview({
  formConfig,
  extractedFields,
  onFieldsUpdate,
  disabled,
}: FormPreviewProps) {
  const handleFieldChange = (fieldId: string, value: any) => {
    if (disabled) return
    onFieldsUpdate({ ...extractedFields, [fieldId]: value })
  }

  const fields = formConfig.extraction?.fields || []
  const filledCount = fields.filter(f => extractedFields[f.id]).length
  const totalCount = fields.length

  const getConfidenceBadge = (confidence?: number) => {
    if (!confidence) return null

    const variant = confidence >= 0.8 ? 'default' : confidence >= 0.6 ? 'secondary' : 'destructive'

    return (
      <Badge variant={variant} size="sm">
        {Math.round(confidence * 100)}% confident
      </Badge>
    )
  }

  return (
    <Div className="p-6">
      <Div className="mb-6">
        <H3 size="h4" className="mb-2">
          Form Preview
        </H3>
        <Div className="flex items-center gap-2">
          <P className="text-sm text-muted-foreground">
            {filledCount} / {totalCount} fields filled
          </P>
          <Div className="flex-1 bg-muted rounded-full h-2">
            <Div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${(filledCount / totalCount) * 100}%` }}
            />
          </Div>
        </Div>
      </Div>

      <Div className="space-y-4">
        {fields.map(field => {
          const value = extractedFields[field.id]
          const isFilled = value !== undefined && value !== null && value !== ''
          const confidence = extractedFields[`${field.id}_confidence`]

          return (
            <Card key={field.id} className={isFilled ? 'border-primary' : 'border-muted'}>
              <CardContent className="p-4">
                <Div className="flex items-start justify-between mb-2">
                  <Label htmlFor={field.id} className="flex items-center gap-2">
                    {field.label}
                    {field.required && <Span className="text-destructive">*</Span>}
                  </Label>
                  {isFilled && confidence && getConfidenceBadge(confidence)}
                </Div>

                <Input
                  id={field.id}
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={value || ''}
                  onChange={e =>
                    handleFieldChange(
                      field.id,
                      field.type === 'number' ? parseFloat(e.target.value) : e.target.value
                    )
                  }
                  placeholder={
                    field.extraction?.examples?.[0] || `Enter ${field.label.toLowerCase()}`
                  }
                  disabled={disabled}
                  className={isFilled ? 'border-primary' : ''}
                />

                {field.helpText && (
                  <P className="text-xs text-muted-foreground mt-1">{field.helpText}</P>
                )}

                {field.extraction?.keywords && field.extraction.keywords.length > 0 && (
                  <Div className="flex gap-1 mt-2 flex-wrap">
                    {field.extraction.keywords.slice(0, 3).map(keyword => (
                      <Span key={keyword} className="text-xs px-2 py-0.5 bg-muted rounded">
                        {keyword}
                      </Span>
                    ))}
                  </Div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </Div>

      {filledCount === totalCount && (
        <Card className="mt-6 border-primary bg-primary/5">
          <CardContent className="p-4">
            <P className="text-sm font-medium">
              ✅ All fields filled! You can now submit the form.
            </P>
          </CardContent>
        </Card>
      )}
    </Div>
  )
}
