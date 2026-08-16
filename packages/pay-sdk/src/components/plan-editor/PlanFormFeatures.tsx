'use client'

/**
 * Features + grants + sortOrder/active fields section of the plan editor.
 *
 * Pure presentational sub-component — receives values + setters from the
 * parent `PlanEditorDialog`.
 *
 * @internal
 */

import { Div, Input, Label, P, Switch } from '@ezstart/ui/components'
import type { PlanEditorDialogTexts } from './plan-editor-types.js'

export interface PlanFormFeaturesProps {
  features: string
  grantsRoles: string
  grantsFeatures: string
  sortOrder: string
  active: boolean
  onFeaturesChange: (value: string) => void
  onGrantsRolesChange: (value: string) => void
  onGrantsFeaturesChange: (value: string) => void
  onSortOrderChange: (value: string) => void
  onActiveChange: (value: boolean) => void
  texts: PlanEditorDialogTexts
}

export function PlanFormFeatures({
  features,
  grantsRoles,
  grantsFeatures,
  sortOrder,
  active,
  onFeaturesChange,
  onGrantsRolesChange,
  onGrantsFeaturesChange,
  onSortOrderChange,
  onActiveChange,
  texts,
}: PlanFormFeaturesProps) {
  return (
    <>
      <Div className="space-y-2">
        <Label htmlFor="plan-features">{texts.featuresLabel}</Label>
        <Input
          id="plan-features"
          value={features}
          onChange={e => onFeaturesChange(e.target.value)}
          placeholder="Feature 1, Feature 2"
        />
        <P className="text-xs text-muted-foreground">{texts.featuresHelp}</P>
      </Div>

      <Div className="space-y-2">
        <Label htmlFor="plan-grants-roles">{texts.grantsRolesLabel}</Label>
        <Input
          id="plan-grants-roles"
          value={grantsRoles}
          onChange={e => onGrantsRolesChange(e.target.value)}
          placeholder="pro, premium"
        />
        <P className="text-xs text-muted-foreground">{texts.grantsRolesHelp}</P>
      </Div>

      <Div className="space-y-2">
        <Label htmlFor="plan-grants-features">{texts.grantsFeaturesLabel}</Label>
        <Input
          id="plan-grants-features"
          value={grantsFeatures}
          onChange={e => onGrantsFeaturesChange(e.target.value)}
          placeholder="advanced_analytics, sso"
        />
        <P className="text-xs text-muted-foreground">{texts.grantsFeaturesHelp}</P>
      </Div>

      <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Div className="space-y-2">
          <Label htmlFor="plan-sort-order">{texts.sortOrderLabel}</Label>
          <Input
            id="plan-sort-order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={e => onSortOrderChange(e.target.value)}
          />
        </Div>

        <Div className="flex items-center justify-between gap-2 pt-6">
          <Label htmlFor="plan-active">{texts.activeLabel}</Label>
          <Switch id="plan-active" checked={active} onCheckedChange={onActiveChange} />
        </Div>
      </Div>
    </>
  )
}
