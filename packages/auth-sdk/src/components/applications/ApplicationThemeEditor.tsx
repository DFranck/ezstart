'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Div,
  Input,
  Label,
  P,
  Span,
  Switch,
} from '@ezstart/ui/components'
import { toast } from '@ezstart/ui/utils'
import { useEffect, useMemo, useState } from 'react'
import type { Application, ApplicationTheme } from '../../core/types.js'
import { useUpdateApplicationTheme } from '../../react/applications.js'
import type { ApplicationDetailViewTexts } from './types.js'

export interface ApplicationThemeEditorProps {
  application: Application
  /**
   * When `false`, the enable toggle is shown but disabled and labeled as a
   * Pro-only feature. The primary color input remains enabled so owners
   * can preview the feature before upgrading.
   */
  canEnableTheme?: boolean
  texts: ApplicationDetailViewTexts
}

interface DraftTheme {
  primary: string
  logo: string
}

const EMPTY_DRAFT: DraftTheme = {
  primary: '',
  logo: '',
}

function toDraft(theme: ApplicationTheme | null | undefined): DraftTheme {
  if (!theme) return EMPTY_DRAFT
  return {
    primary: theme.primary ?? '',
    logo: theme.logo ?? '',
  }
}

function draftToPayload(draft: DraftTheme): ApplicationTheme | null {
  const clean: ApplicationTheme = {}
  if (draft.primary.trim()) clean.primary = draft.primary.trim()
  if (draft.logo.trim()) clean.logo = draft.logo.trim()
  return Object.keys(clean).length > 0 ? clean : null
}

/**
 * Tiny heuristic used to decide whether a color string is suitable for a
 * native `<input type="color">`. The color picker only accepts `#rrggbb`,
 * so we mirror the text input into it when possible; otherwise the picker
 * falls back to a neutral default so the user can still click it to pick a
 * replacement.
 */
function toHexForPicker(value: string): string {
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    // Expand #rgb → #rrggbb
    const r = trimmed[1]
    const g = trimmed[2]
    const b = trimmed[3]
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return '#64748b'
}

/**
 * Editor + preview for an Application's white-label theme. Used as the
 * "Theme" tab inside `ApplicationDetailView`.
 *
 * **Primary-only philosophy (2026-04-24):** the editor exposes only
 * `primary` + `logo` + the enable toggle. The other tokens
 * (`background`, `foreground`, `accent`) are retained in the backend
 * schema for backwards compatibility but are NOT rendered or editable
 * here — the EZAuth auth pages only override `--primary` so light/dark
 * mode (driven by next-themes) keeps working correctly across tenants.
 * If a tenant document still has legacy bg/fg/accent values set, they are
 * preserved on save (we only patch the keys we render) but silently
 * ignored by the SSR renderer.
 *
 * The preview card uses inline CSS variables to show the chosen primary
 * on a mock sign-in button; background / text colors come from the app's
 * design tokens so the preview matches what users actually see on the
 * auth pages.
 */
export function ApplicationThemeEditor({
  application,
  canEnableTheme = true,
  texts,
}: ApplicationThemeEditorProps) {
  const [draft, setDraft] = useState<DraftTheme>(() => toDraft(application.theme))
  const [enabled, setEnabled] = useState<boolean>(application.themeEnabled ?? false)

  useEffect(() => {
    setDraft(toDraft(application.theme))
    setEnabled(application.themeEnabled ?? false)
  }, [application.id, application.theme, application.themeEnabled])

  const mutation = useUpdateApplicationTheme({
    onSuccess: () => {
      toast.success(texts.themeSaveSuccess)
    },
    onError: () => {
      toast.error(texts.themeSaveFailed)
    },
  })

  const previewStyle = useMemo(() => {
    const style: Record<string, string> = {}
    if (draft.primary.trim()) style['--preview-primary'] = draft.primary.trim()
    return style as React.CSSProperties
  }, [draft])

  const isDirty = useMemo(() => {
    const current = toDraft(application.theme)
    return (
      enabled !== (application.themeEnabled ?? false) ||
      current.primary !== draft.primary ||
      current.logo !== draft.logo
    )
  }, [draft, enabled, application.theme, application.themeEnabled])

  const handleReset = () => {
    setDraft(toDraft(application.theme))
    setEnabled(application.themeEnabled ?? false)
  }

  const handleSave = () => {
    mutation.mutate({
      id: application.id,
      data: {
        theme: draftToPayload(draft),
        themeEnabled: enabled,
      },
    })
  }

  return (
    <Div className="space-y-4">
      <Card>
        <CardHeader>
          <Div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <Div className="space-y-1">
              <CardTitle>{texts.themeTitle}</CardTitle>
              <CardDescription>{texts.themeDescription}</CardDescription>
            </Div>
            <Div className="flex items-center gap-3">
              <Div className="flex flex-col items-end gap-1">
                <Label htmlFor="theme-enabled" className="text-sm">
                  {texts.themeEnableLabel}
                </Label>
                {!canEnableTheme && (
                  <Span className="text-xs text-muted-foreground">{texts.themeProLockedLabel}</Span>
                )}
              </Div>
              <Switch
                id="theme-enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
                disabled={!canEnableTheme}
              />
            </Div>
          </Div>
        </CardHeader>
        <CardContent className="space-y-6">
          <P className="text-xs text-muted-foreground">{texts.themeEnableHelp}</P>

          <Div className="space-y-2">
            <Label htmlFor="theme-primary">{texts.themePrimaryLabel}</Label>
            <Div className="flex items-center gap-2">
              <input
                type="color"
                aria-hidden
                tabIndex={-1}
                value={toHexForPicker(draft.primary)}
                onChange={e => setDraft(d => ({ ...d, primary: e.target.value }))}
                className="h-10 w-12 rounded-md border border-input bg-background cursor-pointer"
              />
              <Input
                id="theme-primary"
                type="text"
                value={draft.primary}
                onChange={e => setDraft(d => ({ ...d, primary: e.target.value }))}
                placeholder="#00D9F7 or oklch(0.7 0.15 210)"
                maxLength={64}
                className="flex-1"
              />
            </Div>
          </Div>

          <Div className="space-y-2">
            <Label htmlFor="theme-logo">{texts.themeLogoLabel}</Label>
            <Input
              id="theme-logo"
              type="url"
              placeholder={texts.themeLogoPlaceholder}
              value={draft.logo}
              onChange={e => setDraft(d => ({ ...d, logo: e.target.value }))}
              maxLength={2048}
            />
          </Div>

          <Div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={!isDirty || mutation.isPending}
            >
              {texts.themeReset}
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || mutation.isPending}>
              {mutation.isPending ? texts.themeSaving : texts.themeSave}
            </Button>
          </Div>
        </CardContent>
      </Card>

      <ThemePreview style={previewStyle} texts={texts} />
    </Div>
  )
}

interface ThemePreviewProps {
  style: React.CSSProperties
  texts: ApplicationDetailViewTexts
}

function ThemePreview({ style, texts }: ThemePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{texts.themePreviewTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        <Div className="rounded-lg border p-6 bg-card text-card-foreground" style={style}>
          <Div className="space-y-4">
            <Div className="space-y-1">
              <Div className="text-lg font-semibold text-foreground">{texts.themePreviewTitle}</Div>
              <Div className="text-sm text-muted-foreground">{texts.themePreviewSubtitle}</Div>
            </Div>
            <Div
              className="w-full rounded-md px-4 py-2 text-center text-sm font-medium"
              style={{
                background: 'var(--preview-primary, var(--primary))',
                color: 'var(--primary-foreground)',
              }}
              role="presentation"
              aria-hidden
            >
              {texts.themePreviewSignInCta}
            </Div>
          </Div>
        </Div>
      </CardContent>
    </Card>
  )
}
