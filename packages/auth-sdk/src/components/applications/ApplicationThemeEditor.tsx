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
   * Pro-only feature. The color inputs remain enabled so owners can preview
   * the feature before upgrading.
   */
  canEnableTheme?: boolean
  texts: ApplicationDetailViewTexts
}

interface DraftTheme {
  primary: string
  background: string
  foreground: string
  accent: string
  logo: string
}

const EMPTY_DRAFT: DraftTheme = {
  primary: '',
  background: '',
  foreground: '',
  accent: '',
  logo: '',
}

function toDraft(theme: ApplicationTheme | null | undefined): DraftTheme {
  if (!theme) return EMPTY_DRAFT
  return {
    primary: theme.primary ?? '',
    background: theme.background ?? '',
    foreground: theme.foreground ?? '',
    accent: theme.accent ?? '',
    logo: theme.logo ?? '',
  }
}

function draftToPayload(draft: DraftTheme): ApplicationTheme | null {
  const clean: ApplicationTheme = {}
  if (draft.primary.trim()) clean.primary = draft.primary.trim()
  if (draft.background.trim()) clean.background = draft.background.trim()
  if (draft.foreground.trim()) clean.foreground = draft.foreground.trim()
  if (draft.accent.trim()) clean.accent = draft.accent.trim()
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
 * "Theme" tab inside `ApplicationDetailView`. The preview renders a tiny
 * mock login card with the draft tokens applied via inline CSS variables,
 * so owners can eyeball the result before persisting.
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
    if (draft.background.trim()) style['--preview-background'] = draft.background.trim()
    if (draft.foreground.trim()) style['--preview-foreground'] = draft.foreground.trim()
    if (draft.accent.trim()) style['--preview-accent'] = draft.accent.trim()
    return style as React.CSSProperties
  }, [draft])

  const isDirty = useMemo(() => {
    const current = toDraft(application.theme)
    return (
      enabled !== (application.themeEnabled ?? false) ||
      current.primary !== draft.primary ||
      current.background !== draft.background ||
      current.foreground !== draft.foreground ||
      current.accent !== draft.accent ||
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

          <Div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ThemeColorField
              id="theme-primary"
              label={texts.themePrimaryLabel}
              value={draft.primary}
              onChange={value => setDraft(d => ({ ...d, primary: value }))}
            />
            <ThemeColorField
              id="theme-background"
              label={texts.themeBackgroundLabel}
              value={draft.background}
              onChange={value => setDraft(d => ({ ...d, background: value }))}
            />
            <ThemeColorField
              id="theme-foreground"
              label={texts.themeForegroundLabel}
              value={draft.foreground}
              onChange={value => setDraft(d => ({ ...d, foreground: value }))}
            />
            <ThemeColorField
              id="theme-accent"
              label={texts.themeAccentLabel}
              value={draft.accent}
              onChange={value => setDraft(d => ({ ...d, accent: value }))}
            />
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

interface ThemeColorFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}

function ThemeColorField({ id, label, value, onChange }: ThemeColorFieldProps) {
  return (
    <Div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Div className="flex items-center gap-2">
        <input
          type="color"
          aria-hidden
          tabIndex={-1}
          value={toHexForPicker(value)}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-12 rounded-md border border-input bg-background cursor-pointer"
        />
        <Input
          id={id}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="#00D9F7 or oklch(0.7 0.15 210)"
          maxLength={64}
          className="flex-1"
        />
      </Div>
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
        <Div
          className="rounded-lg border p-6"
          style={{
            ...style,
            background: 'var(--preview-background, hsl(var(--card)))',
            color: 'var(--preview-foreground, hsl(var(--card-foreground)))',
            borderColor: 'var(--preview-accent, hsl(var(--border)))',
          }}
        >
          <Div className="space-y-4">
            <Div className="space-y-1">
              <Div
                className="text-lg font-semibold"
                style={{ color: 'var(--preview-foreground, inherit)' }}
              >
                {texts.themePreviewTitle}
              </Div>
              <Div
                className="text-sm"
                style={{
                  color: 'var(--preview-foreground, hsl(var(--muted-foreground)))',
                  opacity: 0.75,
                }}
              >
                {texts.themePreviewSubtitle}
              </Div>
            </Div>
            <Div
              className="w-full rounded-md px-4 py-2 text-center text-sm font-medium"
              style={{
                background: 'var(--preview-primary, hsl(var(--primary)))',
                color: 'var(--preview-background, hsl(var(--primary-foreground)))',
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
