'use client'

import {
  Button,
  Div,
  Input,
  Label,
  Modal,
  P,
  Span,
  Spinner,
  Switch,
  Textarea,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useEffect, useMemo, useState } from 'react'
import type { ApplicationTheme } from '../../core/types.js'
import { useUpdateApplication, useUpdateApplicationTheme } from '../../react/applications.js'
import type {
  AdminApplicationRow,
  AuthApplicationsSectionTexts,
} from './AdminApplications.types.js'

export interface EditApplicationModalProps {
  application: AdminApplicationRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
  t: Required<AuthApplicationsSectionTexts>
}

interface ThemeDraft {
  primary: string
  logo: string
}

const EMPTY_THEME_DRAFT: ThemeDraft = { primary: '', logo: '' }

function toThemeDraft(theme: ApplicationTheme | null | undefined): ThemeDraft {
  if (!theme) return EMPTY_THEME_DRAFT
  return {
    primary: theme.primary ?? '',
    logo: theme.logo ?? '',
  }
}

function themeDraftToPayload(draft: ThemeDraft): ApplicationTheme | null {
  const clean: ApplicationTheme = {}
  if (draft.primary.trim()) clean.primary = draft.primary.trim()
  if (draft.logo.trim()) clean.logo = draft.logo.trim()
  return Object.keys(clean).length > 0 ? clean : null
}

/**
 * Heuristic — native `<input type="color">` only accepts `#rrggbb`. Mirror the
 * text input into the picker when possible; otherwise fall back to a neutral
 * default so the picker is still clickable.
 */
function toHexForPicker(value: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return '#64748b'
}

/**
 * Modal that lets a superadmin edit name / description AND the white-label
 * theme of any Application (primary color + logo URL + themeEnabled toggle).
 * Slug is immutable per backend contract.
 *
 * The theme fields follow the same primary-only contract as
 * `<ApplicationThemeEditor>` (cf. `standard-saas.md` §5.2): only `primary`
 * + `logo` + `themeEnabled` are exposed in the UI. The backend schema retains
 * `background` / `foreground` / `accent` for legacy compat but they are NOT
 * rendered as CSS overrides by the EZAuth SSR injector — light/dark mode is
 * handled by next-themes so overriding those tokens would conflict with the
 * end user preference.
 *
 * Two backend endpoints are touched on save: name/description go to
 * `PATCH /applications/:id`, theme/themeEnabled go to
 * `PATCH /applications/:id/theme`. The mutations run in parallel and a
 * single combined toast is shown on completion.
 *
 * @internal
 */
export function EditApplicationModal({
  application,
  open,
  onOpenChange,
  onSaved,
  t,
}: EditApplicationModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [themeDraft, setThemeDraft] = useState<ThemeDraft>(EMPTY_THEME_DRAFT)
  const [themeEnabled, setThemeEnabled] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (application) {
      setName(application.name)
      setDescription(application.description ?? '')
      setThemeDraft(toThemeDraft(application.theme))
      setThemeEnabled(application.themeEnabled ?? false)
      setError('')
    }
  }, [application])

  const update = useUpdateApplication()
  const updateTheme = useUpdateApplicationTheme()

  const isPending = update.isPending || updateTheme.isPending

  const themeDirty = useMemo(() => {
    if (!application) return false
    const current = toThemeDraft(application.theme)
    return (
      themeDraft.primary !== current.primary ||
      themeDraft.logo !== current.logo ||
      themeEnabled !== (application.themeEnabled ?? false)
    )
  }, [application, themeDraft, themeEnabled])

  const metaDirty = useMemo(() => {
    if (!application) return false
    return (
      name.trim() !== application.name ||
      (description.trim() || '') !== (application.description ?? '')
    )
  }, [application, name, description])

  const handleSave = async () => {
    if (!application) return
    setError('')

    const tasks: Promise<unknown>[] = []
    if (metaDirty) {
      tasks.push(
        update.mutateAsync({
          id: application.id,
          data: {
            name: name.trim(),
            description: description.trim() ? description.trim() : undefined,
          },
        })
      )
    }
    if (themeDirty) {
      tasks.push(
        updateTheme.mutateAsync({
          id: application.id,
          data: {
            theme: themeDraftToPayload(themeDraft),
            themeEnabled,
          },
        })
      )
    }
    if (tasks.length === 0) {
      // Defensive — Save button is disabled when nothing is dirty.
      onOpenChange(false)
      return
    }

    try {
      await Promise.all(tasks)
      toast.success(t.editSuccess)
      onSaved()
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : t.editError
      setError(message)
      toast.error(t.editError)
    }
  }

  if (!application) return null

  const canSubmit = !!name.trim() && !isPending && (metaDirty || themeDirty)

  return (
    <Modal
      isOpen={open}
      onClose={() => !isPending && onOpenChange(false)}
      size="xl"
      title={t.editTitle}
      description={t.editDescription}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            {isPending ? <Spinner size="sm" /> : t.save}
          </Button>
        </>
      }
    >
      <Div className="space-y-6">
        {error && (
          <Div className="bg-destructive/15 border border-destructive/50 text-destructive px-4 py-3 rounded-md text-sm">
            {error}
          </Div>
        )}

        <Div className="space-y-4">
          <Div className="space-y-2">
            <Label htmlFor="admin-app-slug">{t.editSlugLabel}</Label>
            <Input id="admin-app-slug" value={application.slug} disabled readOnly />
            <P className="text-xs text-muted-foreground">{t.editSlugHelp}</P>
          </Div>

          <Div className="space-y-2">
            <Label htmlFor="admin-app-name">{t.editNameLabel}</Label>
            <Input
              id="admin-app-name"
              value={name}
              onChange={e => setName(e.target.value)}
              maxLength={100}
              disabled={isPending}
            />
          </Div>

          <Div className="space-y-2">
            <Label htmlFor="admin-app-description">{t.editDescriptionLabel}</Label>
            <Textarea
              id="admin-app-description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              disabled={isPending}
            />
          </Div>
        </Div>

        <Div className="space-y-4 border-t border-border pt-6">
          <Div className="space-y-1">
            <Div className="flex items-center justify-between gap-3">
              <Div className="space-y-1">
                <Span className="text-sm font-semibold">{t.editThemeSectionTitle}</Span>
                <P className="text-xs text-muted-foreground">{t.editThemeSectionDescription}</P>
              </Div>
              <Div className="flex items-center gap-2">
                <Label htmlFor="admin-app-theme-enabled" className="text-sm">
                  {t.editThemeEnableLabel}
                </Label>
                <Switch
                  id="admin-app-theme-enabled"
                  checked={themeEnabled}
                  onCheckedChange={setThemeEnabled}
                  disabled={isPending}
                />
              </Div>
            </Div>
            <P className="text-xs text-muted-foreground">{t.editThemeEnableHelp}</P>
          </Div>

          <Div className="space-y-2">
            <Label htmlFor="admin-app-theme-primary">{t.editThemePrimaryLabel}</Label>
            <Div className="flex items-center gap-2">
              <input
                type="color"
                aria-hidden
                tabIndex={-1}
                value={toHexForPicker(themeDraft.primary)}
                onChange={e => setThemeDraft(d => ({ ...d, primary: e.target.value }))}
                disabled={isPending}
                className="h-10 w-12 rounded-md border border-input bg-background cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Input
                id="admin-app-theme-primary"
                type="text"
                value={themeDraft.primary}
                onChange={e => setThemeDraft(d => ({ ...d, primary: e.target.value }))}
                placeholder="#00D9F7 or oklch(0.7 0.15 210)"
                maxLength={64}
                disabled={isPending}
                aria-describedby="admin-app-theme-primary-help"
                className="flex-1"
              />
            </Div>
            <P id="admin-app-theme-primary-help" className="text-xs text-muted-foreground">
              {t.editThemePrimaryHelp}
            </P>
          </Div>

          <Div className="space-y-2">
            <Label htmlFor="admin-app-theme-logo">{t.editThemeLogoLabel}</Label>
            <Input
              id="admin-app-theme-logo"
              type="url"
              value={themeDraft.logo}
              onChange={e => setThemeDraft(d => ({ ...d, logo: e.target.value }))}
              placeholder={t.editThemeLogoPlaceholder}
              maxLength={2048}
              disabled={isPending}
              aria-describedby="admin-app-theme-logo-help"
            />
            <P id="admin-app-theme-logo-help" className="text-xs text-muted-foreground">
              {t.editThemeLogoHelp}
            </P>
          </Div>
        </Div>
      </Div>
    </Modal>
  )
}
