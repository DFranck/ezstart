'use client'

/**
 * General fields section of the plan editor: name + description.
 *
 * Pure presentational sub-component — receives values + setters from the
 * parent `PlanEditorDialog`.
 *
 * @internal
 */

import { Div, Input, Label, P, Textarea } from '@ezstart/ui/components'
import type { PlanEditorDialogTexts, PlanFormFieldErrors } from './plan-editor-types.js'

export interface PlanFormGeneralProps {
  name: string
  description: string
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  errors: PlanFormFieldErrors
  texts: PlanEditorDialogTexts
}

export function PlanFormGeneral({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  errors,
  texts,
}: PlanFormGeneralProps) {
  return (
    <>
      <Div className="space-y-2">
        <Label htmlFor="plan-name">{texts.nameLabel}</Label>
        <Input
          id="plan-name"
          placeholder={texts.namePlaceholder}
          value={name}
          onChange={e => onNameChange(e.target.value)}
          maxLength={100}
          aria-invalid={!!errors.name}
        />
        {errors.name && <P className="text-xs text-destructive">{errors.name}</P>}
      </Div>

      <Div className="space-y-2">
        <Label htmlFor="plan-description">{texts.descriptionLabel}</Label>
        <Textarea
          id="plan-description"
          placeholder={texts.descriptionPlaceholder}
          value={description}
          onChange={e => onDescriptionChange(e.target.value)}
          maxLength={500}
          rows={2}
        />
      </Div>
    </>
  )
}
