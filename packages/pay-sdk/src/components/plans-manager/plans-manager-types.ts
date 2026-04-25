/**
 * Type definitions and helpers shared by the PlansManager sub-components.
 *
 * @internal
 */

import {
  defaultPlanEditorDialogTexts,
  type PlanEditorDialogTexts,
} from '../plan-editor/plan-editor-types.js'

export interface PlansManagerTexts {
  title: string
  subtitle: string
  createButton: string
  empty: string
  loading: string
  fetchFailed: string
  retry: string
  columns: {
    name: string
    price: string
    interval: string
    status: string
    features: string
    actions: string
  }
  status: {
    active: string
    inactive: string
  }
  intervals: {
    month: string
    year: string
  }
  actions: {
    edit: string
    archive: string
    archiveConfirm: string
    archiveCancel: string
    archiveConfirmDescription: string
  }
  toast: {
    created: string
    updated: string
    archived: string
    error: string
  }
  editor: PlanEditorDialogTexts
}

export const defaultPlansManagerTexts: PlansManagerTexts = {
  title: 'Plans',
  subtitle: 'Manage subscription plans for this application',
  createButton: 'Create Plan',
  empty: 'No plans yet. Create your first plan.',
  loading: 'Loading plans...',
  fetchFailed: 'Failed to load plans',
  retry: 'Retry',
  columns: {
    name: 'Name',
    price: 'Price',
    interval: 'Interval',
    status: 'Status',
    features: 'Features',
    actions: 'Actions',
  },
  status: {
    active: 'Active',
    inactive: 'Inactive',
  },
  intervals: {
    month: 'Monthly',
    year: 'Yearly',
  },
  actions: {
    edit: 'Edit',
    archive: 'Archive',
    archiveConfirm: 'Archive plan',
    archiveCancel: 'Cancel',
    archiveConfirmDescription:
      'This plan will no longer be available for new subscriptions. Existing subscriptions continue on the archived price.',
  },
  toast: {
    created: 'Plan created',
    updated: 'Plan updated',
    archived: 'Plan archived',
    error: 'An error occurred',
  },
  editor: defaultPlanEditorDialogTexts,
}

export function mergePlansManagerTexts(partial?: Partial<PlansManagerTexts>): PlansManagerTexts {
  if (!partial) return defaultPlansManagerTexts
  return {
    ...defaultPlansManagerTexts,
    ...partial,
    columns: { ...defaultPlansManagerTexts.columns, ...partial.columns },
    status: { ...defaultPlansManagerTexts.status, ...partial.status },
    intervals: { ...defaultPlansManagerTexts.intervals, ...partial.intervals },
    actions: { ...defaultPlansManagerTexts.actions, ...partial.actions },
    toast: { ...defaultPlansManagerTexts.toast, ...partial.toast },
    editor: {
      ...defaultPlansManagerTexts.editor,
      ...partial.editor,
      validation: {
        ...defaultPlansManagerTexts.editor.validation,
        ...partial.editor?.validation,
      },
      toast: {
        ...defaultPlansManagerTexts.editor.toast,
        ...partial.editor?.toast,
      },
    },
  }
}
